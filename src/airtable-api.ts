import type {
  AirtableTable,
  AirtableTablesResponse,
  AirtableRecordsResponse,
  AirtableHuman,
  AirtableView,
} from './types/airtable';

// Configuration - token comes from .env.local (VITE_AIRTABLE_API_KEY)
const AIRTABLE_CONFIG = {
  apiKey: import.meta.env.VITE_AIRTABLE_API_KEY ?? '',
  baseId: 'app39VsA3z85GTMbT',
  humansTableId: 'tbl6LptFEMKLaN0I9',
  phoneFields: ['Phone Number', 'Phone Number 2', 'Phone Number 3'],
} as const;

export class AirtableClient {
  private apiKey: string;
  private baseId: string;

  constructor(apiKey: string = AIRTABLE_CONFIG.apiKey, baseId: string = AIRTABLE_CONFIG.baseId) {
    this.apiKey = apiKey;
    this.baseId = baseId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/airtable${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.statusText}. ${errorText}`);
    }

    return response.json();
  }

  async getTableMetadata(): Promise<AirtableTable | null> {
    const response = await this.request<AirtableTablesResponse>(
      `/v0/meta/bases/${this.baseId}/tables`
    );

    return response.tables.find(t => t.id === AIRTABLE_CONFIG.humansTableId) || null;
  }

  async getHumansTableViews(): Promise<AirtableView[]> {
    const table = await this.getTableMetadata();
    if (!table) return [];

    // Return all grid views (most useful for contact lists)
    return table.views.filter(v => v.type === 'grid');
  }

  async getRecordsFromView(viewId: string): Promise<AirtableHuman[]> {
    const allRecords: AirtableHuman[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        view: viewId,
      });

      // Add fields we need
      params.append('fields[]', 'Name');
      params.append('fields[]', 'UW26 Intro Text Sent');
      AIRTABLE_CONFIG.phoneFields.forEach(field => {
        params.append('fields[]', field);
      });

      if (offset) {
        params.set('offset', offset);
      }

      const response = await this.request<AirtableRecordsResponse>(
        `/v0/${this.baseId}/${AIRTABLE_CONFIG.humansTableId}?${params.toString()}`
      );

      const humans = response.records.map(record => this.transformToHuman(record));
      allRecords.push(...humans);

      offset = response.offset;
    } while (offset);

    return allRecords;
  }

  async updateHumanRecord(recordId: string, fields: Record<string, unknown>): Promise<void> {
    await this.request(`/v0/${this.baseId}/${AIRTABLE_CONFIG.humansTableId}/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
  }

  private transformToHuman(record: { id: string; fields: Record<string, unknown> }): AirtableHuman {
    const phoneNumbers: string[] = [];

    AIRTABLE_CONFIG.phoneFields.forEach(fieldName => {
      const phone = record.fields[fieldName];
      if (typeof phone === 'string' && phone.trim()) {
        phoneNumbers.push(phone.trim());
      }
    });

    return {
      id: record.id,
      name: (record.fields['Name'] as string) || 'Unknown',
      phoneNumbers,
      introTextSent: Boolean(record.fields['UW26 Intro Text Sent']),
      fields: record.fields,
    };
  }
}

export const airtableClient = new AirtableClient();
