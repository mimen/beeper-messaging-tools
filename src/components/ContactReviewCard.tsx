import { useState } from 'react';
import type { BeeperClient } from '../beeper-api';
import type { ReviewContact } from '../types/messaging';
import { ConversationHistory } from './ConversationHistory';

interface ContactReviewCardProps {
  contact: ReviewContact;
  client: BeeperClient;
  onSend: (message: string, advance: boolean) => Promise<void>;
  onSkip: () => void;
  disabled?: boolean;
}

export function ContactReviewCard({
  contact,
  client,
  onSend,
  onSkip,
  disabled,
}: ContactReviewCardProps) {
  const [editedMessage, setEditedMessage] = useState(contact.message);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  const handleSend = async (advance: boolean) => {
    if (!editedMessage.trim()) return;

    setSending(true);
    setSendError(null);

    try {
      await onSend(editedMessage, advance);
      if (!advance) {
        setEditedMessage('');
        setJustSent(true);
        setTimeout(() => setJustSent(false), 2000);
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    handleSend(true);
  };

  return (
    <div className="space-y-4">
      {/* Contact header */}
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-200 font-bold text-lg">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{contact.name}</p>
          <p className="text-slate-400 text-sm font-mono">{contact.phoneNumber}</p>
        </div>
      </div>

      {/* Conversation history */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-2">Conversation History</h4>
        <ConversationHistory client={client} chatID={contact.chatID} />
      </div>

      {/* Message editor */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Message
        </label>
        <textarea
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          disabled={sending || disabled}
          className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          rows={4}
        />
      </div>

      {/* Send error */}
      {sendError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between">
          <p className="text-red-200 text-sm">{sendError}</p>
          <button
            onClick={handleRetry}
            className="text-sm text-purple-400 hover:text-purple-300 ml-3 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success indicator */}
      {justSent && (
        <p className="text-green-400 text-sm">Message sent!</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSend(false)}
          disabled={sending || disabled || !editedMessage.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
        <button
          onClick={() => handleSend(true)}
          disabled={sending || disabled || !editedMessage.trim()}
          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {sending ? 'Sending...' : 'Send & Next'}
        </button>
        <button
          onClick={onSkip}
          disabled={sending || disabled}
          className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
