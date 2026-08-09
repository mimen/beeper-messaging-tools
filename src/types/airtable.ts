// Airtable view metadata
export interface AirtableView {
  id: string;
  name: string;
  type: 'grid' | 'form' | 'calendar' | 'gallery' | 'kanban' | 'timeline' | 'block';
}

// Airtable table metadata
export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
  views: AirtableView[];
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
}

// Airtable API response for table metadata
export interface AirtableTablesResponse {
  tables: AirtableTable[];
}

// Airtable API response for records
export interface AirtableRecordsResponse {
  records: Array<{
    id: string;
    createdTime: string;
    fields: Record<string, unknown>;
  }>;
  offset?: string;
}

// Human record from Airtable
export interface AirtableHuman {
  id: string;
  name: string;
  phoneNumbers: string[];
  introTextSent: boolean;
  fields: Record<string, unknown>;
}

// Contact ready for messaging
export interface MessagingContact {
  id: string;
  name: string;
  phoneNumber: string;
  allPhoneNumbers: string[];
  selected: boolean;
}
