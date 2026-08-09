import { useState, useEffect, useRef } from 'react';
import type { BeeperClient, ChatMessage } from '../beeper-api';

interface ConversationHistoryProps {
  client: BeeperClient;
  chatID: string | null;
}

export function ConversationHistory({ client, chatID }: ConversationHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatID) {
      setMessages([]);
      setError(null);
      setHasMore(false);
      setNextCursor(null);
      return;
    }

    setInitialLoad(true);
    loadMessages(chatID);
  }, [chatID]);

  const loadMessages = async (id: string, cursor?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.listMessages(id, {
        cursor,
        direction: cursor ? 'before' : undefined,
      });

      // API returns newest first; we reverse to show oldest-top, newest-bottom
      const newMessages = [...result.items].reverse();

      if (cursor) {
        // Prepend older messages when loading more
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }

      setHasMore(result.hasMore);

      // The cursor for "load more" (older) is the sortKey of the oldest message returned
      if (result.items.length > 0) {
        // result.items is newest-first, so last item is oldest
        setNextCursor(result.items[result.items.length - 1].sortKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      if (!cursor) setMessages([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleLoadMore = () => {
    if (!chatID || !nextCursor) return;
    loadMessages(chatID, nextCursor);
  };

  const handleRetry = () => {
    if (!chatID) return;
    loadMessages(chatID);
  };

  if (!chatID) {
    return (
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-200 text-sm">No previous conversation found. A new chat will be created when you send.</p>
      </div>
    );
  }

  if (loading && initialLoad) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading conversation...</p>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-200 text-sm mb-2">Failed to load messages: {error}</p>
        <button
          onClick={handleRetry}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (messages.length === 0 && !loading) {
    return (
      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-slate-400 text-sm">No messages found in this conversation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Load more button at top */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loading}
          className="w-full text-sm text-purple-400 hover:text-purple-300 disabled:text-slate-500 py-1 transition-colors"
        >
          {loading ? 'Loading...' : 'Load more messages'}
        </button>
      )}

      {/* Messages */}
      <div className="space-y-2 max-h-64 overflow-y-auto p-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.isSender ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.isSender
                  ? 'bg-purple-500/30 text-purple-100'
                  : 'bg-slate-600/50 text-slate-200'
              }`}
            >
              {!msg.isSender && msg.senderName && (
                <p className="text-xs text-slate-400 mb-1">{msg.senderName}</p>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">
                {msg.text || '(no text)'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(msg.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
