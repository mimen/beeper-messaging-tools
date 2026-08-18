// Simple SDK-like wrapper for Beeper API

export interface BeeperAccount {
  accountID: string;
  network: string | null;
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
  senderName?: string;
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
  private baseURL: string;

  constructor(baseURL: string = '/api/beeper') {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`API request failed (${response.status}): ${response.statusText}`);
    }

    return response.json();
  }

  async getAccounts(): Promise<BeeperAccount[]> {
    return this.request<BeeperAccount[]>('/accounts');
  }

  async searchChats(options: SearchChatsOptions = {}): Promise<{ items: BeeperChat[] }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.query) params.set('query', options.query);
    options.accountIDs?.forEach((accountID) => params.append('accountIDs', accountID));

    const query = params.toString();
    return this.request<{ items: BeeperChat[] }>(`/chats/search${query ? '?' + query : ''}`);
  }

  async searchMessages(options: SearchMessagesOptions = {}): Promise<{ items: BeeperMessage[] }> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.query) params.set('query', options.query);

    if (options.chatID && !options.query) {
      const chatID = encodeURIComponent(options.chatID);
      const page = await this.request<{ items: BeeperMessage[] }>(`/chats/${chatID}/messages`);
      return options.limit ? { items: page.items.slice(0, options.limit) } : page;
    }

    if (options.chatID) params.append('chatIDs', options.chatID);
    const searchQuery = params.toString();
    return this.request<{ items: BeeperMessage[] }>(`/messages/search${searchQuery ? '?' + searchQuery : ''}`);
  }

  async getChat(chatID: string): Promise<BeeperChat> {
    return this.request<BeeperChat>(`/chats/${encodeURIComponent(chatID)}`);
  }
}
