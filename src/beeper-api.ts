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
  participants?: {
    items: Array<{
      id: string;
      phoneNumber?: string;
      fullName?: string;
      isSelf?: boolean;
      [key: string]: any;
    }>;
    hasMore: boolean;
    total: number;
  };
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

export interface BeeperUser {
  id: string;
  username?: string;
  phoneNumber?: string;
  email?: string;
  fullName?: string;
  imgURL?: string;
  cannotMessage?: boolean;
  isSelf?: boolean;
}

export interface CreateChatOptions {
  accountID: string;
  type: 'single' | 'group';
  participantIDs: string[];
  title?: string;
  messageText?: string;
}

export interface SendMessageOptions {
  chatID: string;
  text?: string;
  replyToMessageID?: string;
}

export class BeeperClient {
  private accessToken: string;
  private baseURL: string;

  constructor(accessToken: string, baseURL: string = '/v0') {
    this.accessToken = accessToken;
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.statusText}. ${errorText}`);
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

  async searchUsers(accountID: string, query: string): Promise<{ items: BeeperUser[] }> {
    const params = new URLSearchParams({ accountID, query });
    return this.request<{ items: BeeperUser[] }>(`/search-users?${params.toString()}`);
  }

  async createChat(options: CreateChatOptions): Promise<{ chatID: string }> {
    return this.request<{ chatID: string }>('/create-chat', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<{ messageID: string }> {
    return this.request<{ messageID: string }>('/send-message', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}
