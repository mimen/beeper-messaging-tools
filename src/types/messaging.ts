export type ReviewContactStatus = 'pending' | 'reviewing' | 'sent' | 'skipped' | 'error';

export interface ReviewContact {
  phoneNumber: string;
  name: string;
  message: string;
  status: ReviewContactStatus;
  chatID: string | null;
  airtableRecordId: string | null;
  error?: string;
}

export interface ReviewSummary {
  total: number;
  sent: number;
  skipped: number;
  errors: number;
}
