// Simple SDK-like wrapper for Beeper API

export interface BeeperAccount {
  accountID: string;
  network: string;
  user: {
    id: string;
    fullName?: string;
    phoneNumber?: string;
    username?: string;
    email?: string;
    avatarURL?: string;
    isSelf?: boolean;
  };
}

export interface BeeperChat {
  id: string;
  localChatID?: string;
  accountID: string;
  title?: string;
  type: string;
  network?: string;
  lastActivity?: string;
  unreadCount?: number;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
}

export interface BeeperMessage {
  id: string;
  chatID: string;
  text?: string;
  sender?: {
    id: string;
    fullName?: string;
    username?: string;
    phoneNumber?: string;
  };
  timestamp?: string;
  sortKey?: number;
}

export interface SearchChatsOptions {
  limit?: number;
  query?: string;
  accountIDs?: string[];
}

export interface SearchMessagesOptions {
  chatID?: string;
  limit?: number;
  query?: string;
}

export class BeeperClient {
  private accessToken: string;
  private baseURL: string;

  constructor(accessToken: string, baseURL: string = '/v0') {
    this.accessToken = accessToken;
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getAccounts(): Promise<BeeperAccount[]> {
    return this.request<BeeperAccount[]>('/get-accounts');
  }

  async searchChats(options: SearchChatsOptions = {}): Promise<{ items: BeeperChat[] }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.query) params.set('query', options.query);
    if (options.accountIDs) params.set('accountIDs', options.accountIDs.join(','));

    const query = params.toString();
    return this.request<{ items: BeeperChat[] }>(`/search-chats${query ? '?' + query : ''}`);
  }

  async searchMessages(options: SearchMessagesOptions = {}): Promise<{ items: BeeperMessage[] }> {
    const params = new URLSearchParams();
    if (options.chatID) params.set('chatID', options.chatID);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.query) params.set('query', options.query);

    const query = params.toString();
    return this.request<{ items: BeeperMessage[] }>(`/search-messages${query ? '?' + query : ''}`);
  }

  async getChat(chatID: string): Promise<BeeperChat> {
    const params = new URLSearchParams({ chatID });
    return this.request<BeeperChat>(`/get-chat?${params.toString()}`);
  }
}
