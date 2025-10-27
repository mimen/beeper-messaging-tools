import { useState } from 'react';
import { BeeperClient } from './beeper-api';

interface Account {
  accountID: string;
  network: string;
  user: {
    id: string;
    fullName?: string;
    phoneNumber?: string;
    username?: string;
    email?: string;
    avatarURL?: string;
  };
}

interface Chat {
  id: string;
  localChatID?: string;
  accountID: string;
  title?: string;
  type: string;
  lastActivity?: string;
  unreadCount?: number;
  network?: string;
}

interface Message {
  id: string;
  chatID: string;
  text?: string;
  sender?: {
    fullName?: string;
    username?: string;
  };
  timestamp?: string;
}

function App() {
  const [accessToken, setAccessToken] = useState(import.meta.env.VITE_BEEPER_ACCESS_TOKEN || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      setError('Please enter an access token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Attempting to connect to Beeper API...');

      // Initialize Beeper SDK client
      const client = new BeeperClient(accessToken.trim());

      // Fetch accounts
      console.log('Fetching accounts...');
      const accountList = await client.getAccounts();
      console.log('Accounts received:', accountList);
      setAccounts(accountList);

      // Fetch a few recent chats
      console.log('Fetching chats...');
      const chatData = await client.searchChats({ limit: 5 });
      console.log('Chats received:', chatData);
      setChats(chatData.items);

      // Fetch a few messages from the first chat if available
      if (chatData.items.length > 0) {
        const firstChat = chatData.items[0];
        console.log('Fetching messages for chat:', firstChat.id);
        const messageData = await client.searchMessages({ chatID: firstChat.id, limit: 10 });
        console.log('Messages received:', messageData);
        setMessages(messageData.items);
      }

      setIsConnected(true);
      console.log('Successfully connected to Beeper API');
    } catch (err) {
      console.error('Beeper API Error:', err);

      let errorMessage = 'Failed to connect to Beeper API';

      if (err instanceof Error) {
        errorMessage = err.message;

        // Add helpful context for common errors
        if (err.message.includes('fetch') || err.message.includes('network')) {
          errorMessage += '\n\nMake sure Beeper Desktop is running and the API is enabled (Settings → Developers)';
        } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
          errorMessage += '\n\nYour access token may be invalid. Try generating a new one.';
        }
      }

      setError(errorMessage);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Beeper Messaging Tools</h1>
          <p className="text-slate-300">Connect to your local Beeper Desktop API</p>
        </header>

        {!isConnected ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
              <div className="mb-4">
                <label htmlFor="token" className="block text-sm font-medium text-slate-200 mb-2">
                  Access Token
                </label>
                <input
                  id="token"
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Enter your Beeper access token"
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 text-sm whitespace-pre-line">{error}</p>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>

              <div className="mt-4 text-xs text-slate-400">
                <p>To get your access token:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Open Beeper Desktop</li>
                  <li>Go to Settings → Developers</li>
                  <li>Enable "Beeper Desktop API"</li>
                  <li>Click "+" under "Approved connections"</li>
                  <li>Copy your token</li>
                </ol>
                <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded">
                  <p className="text-yellow-200 text-xs">
                    ⚠️ For local use only. Never share your token or use this in production.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Accounts Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Connected Accounts</h2>
              {accounts.length === 0 ? (
                <p className="text-slate-300">No accounts found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {accounts.map((account) => (
                    <div key={account.accountID} className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        {account.user.avatarURL && (
                          <img
                            src={account.user.avatarURL}
                            alt={account.user.fullName || account.network}
                            className="w-12 h-12 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-white font-medium">{account.network}</p>
                          <p className="text-slate-300 text-sm">
                            {account.user.fullName || account.user.username || account.user.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chats Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Recent Chats</h2>
              {chats.length === 0 ? (
                <p className="text-slate-300">No chats found</p>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat) => (
                    <div key={chat.id} className="bg-white/10 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{chat.title || 'Unnamed Chat'}</p>
                          <p className="text-slate-400 text-sm">{chat.network} • {chat.type}</p>
                        </div>
                        {chat.unreadCount !== undefined && chat.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      {chat.lastActivity && (
                        <p className="text-slate-400 text-xs mt-2">
                          Last activity: {new Date(chat.lastActivity).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages Section */}
            {messages.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-4">Recent Messages</h2>
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <p className="text-purple-300 text-sm font-medium">
                            {message.sender?.fullName || message.sender?.username || 'Unknown'}
                          </p>
                          <p className="text-white mt-1">{message.text || '(No text content)'}</p>
                          {message.timestamp && (
                            <p className="text-slate-400 text-xs mt-1">
                              {new Date(message.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Message */}
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-200 text-center font-medium">
                ✓ Successfully connected to Beeper API
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
