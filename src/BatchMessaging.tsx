import { useState } from 'react';
import { BeeperClient } from './beeper-api';
import { AirtableContactPicker } from './components/AirtableContactPicker';
import { AirtableClient } from './airtable-api';
import type { MessagingContact } from './types/airtable';
import type { ReviewContact, ReviewSummary } from './types/messaging';
import { formatPhoneNumber, parsePhoneNumbers } from './utils/phone';
import { buildPhoneChatMap, findOrCreateChat } from './utils/chat-resolver';
import { PersonalizedReview } from './components/PersonalizedReview';

type MessagingMode = 'batch' | 'personalized';

interface BatchMessagingProps {
  client: BeeperClient;
  gmessagesAccountID: string;
}

interface MessageStatus {
  phoneNumber: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  error?: string;
}

export function BatchMessaging({ client, gmessagesAccountID }: BatchMessagingProps) {
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [airtableContacts, setAirtableContacts] = useState<MessagingContact[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [airtableClient] = useState(() => new AirtableClient());
  const [mode, setMode] = useState<MessagingMode>('batch');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewContacts, setReviewContacts] = useState<ReviewContact[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

  const getAllPhoneNumbers = (): string[] => {
    const manualNumbers = parsePhoneNumbers(phoneNumbers);
    const airtableNumbers = airtableContacts.map(c => formatPhoneNumber(c.phoneNumber));
    // Deduplicate
    return [...new Set([...airtableNumbers, ...manualNumbers])];
  };

  // Map phone number to Airtable record ID for updating after send
  const getRecordIdForPhone = (phone: string): string | null => {
    const formatted = formatPhoneNumber(phone);
    const contact = airtableContacts.find(c => formatPhoneNumber(c.phoneNumber) === formatted);
    return contact?.id || null;
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const sendBatchMessages = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    const numbers = getAllPhoneNumbers();
    if (numbers.length === 0) {
      alert('Please select contacts from Airtable or enter phone numbers manually');
      return;
    }

    setIsSending(true);
    const statuses: MessageStatus[] = numbers.map(num => ({
      phoneNumber: num,
      status: 'pending',
    }));
    setMessageStatuses(statuses);

    // Fetch all chats once and build lookup cache
    const chatsResult = await client.searchChats({
      accountIDs: [gmessagesAccountID],
      limit: 100,
    });
    const chatCache = buildPhoneChatMap(chatsResult.items);

    for (let i = 0; i < numbers.length; i++) {
      const phoneNumber = numbers[i];

      setMessageStatuses(prev =>
        prev.map((s, idx) => idx === i ? { ...s, status: 'sending' } : s)
      );

      try {
        const chatID = await findOrCreateChat(client, gmessagesAccountID, phoneNumber, chatCache);
        await client.sendMessage({ chatID, text: message });

        console.log(`Message sent successfully to ${phoneNumber}`);

        const recordId = getRecordIdForPhone(phoneNumber);
        if (recordId) {
          try {
            await airtableClient.updateHumanRecord(recordId, {
              'UW26 Intro Text Sent': true,
            });
          } catch (airtableError) {
            console.error(`Failed to update Airtable record:`, airtableError);
          }
        }

        setMessageStatuses(prev =>
          prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s)
        );
      } catch (error) {
        console.error(`Failed to send message to ${phoneNumber}:`, error);

        setMessageStatuses(prev =>
          prev.map((s, idx) => idx === i ? {
            ...s,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          } : s)
        );
      }

      if (i < numbers.length - 1) {
        await sleep(10000);
      }
    }

    setIsSending(false);
  };

  const startReview = () => {
    if (!message.trim()) {
      alert('Please enter a message template');
      return;
    }

    const numbers = getAllPhoneNumbers();
    if (numbers.length === 0) {
      alert('Please select contacts from Airtable or enter phone numbers manually');
      return;
    }

    const contacts: ReviewContact[] = numbers.map(phone => {
      const airtableContact = airtableContacts.find(
        c => formatPhoneNumber(c.phoneNumber) === phone
      );
      return {
        phoneNumber: phone,
        name: airtableContact?.name ?? phone,
        message,
        status: 'pending',
        chatID: null,
        airtableRecordId: airtableContact?.id ?? null,
      };
    });

    setReviewContacts(contacts);
    setReviewSummary(null);
    setIsReviewing(true);
  };

  const handleReviewComplete = (summary: ReviewSummary) => {
    setReviewSummary(summary);
    setIsReviewing(false);
  };

  const handleReviewCancel = () => {
    setIsReviewing(false);
    setReviewContacts([]);
  };

  const resetForm = () => {
    setPhoneNumbers('');
    setAirtableContacts([]);
    setMessage('');
    setMessageStatuses([]);
    setReviewContacts([]);
    setReviewSummary(null);
    setIsReviewing(false);
  };

  const totalRecipients = getAllPhoneNumbers().length;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Message Sender</h2>

      {/* Mode Toggle */}
      <div className="flex items-center gap-1 p-1 bg-white/10 rounded-lg w-fit mb-4">
        <button
          onClick={() => setMode('batch')}
          disabled={isSending || isReviewing}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'batch'
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:text-white'
          } disabled:cursor-not-allowed`}
        >
          Batch Mode
        </button>
        <button
          onClick={() => setMode('personalized')}
          disabled={isSending || isReviewing}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'personalized'
              ? 'bg-purple-600 text-white'
              : 'text-slate-400 hover:text-white'
          } disabled:cursor-not-allowed`}
        >
          Personalized Mode
        </button>
      </div>

      <p className="text-slate-300 text-sm mb-4">
        {mode === 'batch'
          ? 'Send the same message to multiple phone numbers via Google Messages. 10-second delay between each message.'
          : 'Review each contact one-by-one: see conversation history, edit the message, then send or skip.'}
      </p>

      {/* Personalized Review Mode */}
      {isReviewing ? (
        <PersonalizedReview
          client={client}
          gmessagesAccountID={gmessagesAccountID}
          contacts={reviewContacts}
          onComplete={handleReviewComplete}
          onCancel={handleReviewCancel}
        />
      ) : (
        <div className="space-y-4">
          {/* Airtable Contact Picker */}
          <div className="bg-white/5 rounded-lg p-4">
            <AirtableContactPicker
              onContactsSelected={setAirtableContacts}
              disabled={isSending}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-slate-400 text-sm">OR add manually</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Phone Numbers Input */}
          <div>
            <label htmlFor="phoneNumbers" className="block text-sm font-medium text-slate-200 mb-2">
              Additional Phone Numbers (one per line or comma-separated)
            </label>
            <textarea
              id="phoneNumbers"
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
              placeholder="9259976370&#10;(619) 857-2209&#10;+14155552671"
              disabled={isSending}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={4}
            />
            <p className="text-xs text-slate-400 mt-1">
              US numbers auto-formatted to +1. Accepts any format: 9259976370, (925) 997-6370, +19259976370
            </p>
          </div>

          {/* Total Recipients Display */}
          {totalRecipients > 0 && (
            <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg">
              <p className="text-purple-200 text-sm font-medium">
                Total recipients: {totalRecipients}
                {airtableContacts.length > 0 && ` (${airtableContacts.length} from Airtable)`}
              </p>
            </div>
          )}

          {/* Message Input */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-200 mb-2">
              {mode === 'personalized' ? 'Message Template' : 'Message'}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              disabled={isSending}
              className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {mode === 'batch' ? (
              <button
                onClick={sendBatchMessages}
                disabled={isSending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isSending ? 'Sending...' : 'Send Messages'}
              </button>
            ) : (
              <button
                onClick={startReview}
                disabled={isSending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Start Review
              </button>
            )}

            {(messageStatuses.length > 0 || reviewSummary) && !isSending && (
              <button
                onClick={resetForm}
                className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Batch Mode: Status Display */}
          {mode === 'batch' && messageStatuses.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Message Status</h3>
              <div className="space-y-2">
                {messageStatuses.map((status, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      status.status === 'success' ? 'bg-green-500/20 border border-green-500/50' :
                      status.status === 'error' ? 'bg-red-500/20 border border-red-500/50' :
                      status.status === 'sending' ? 'bg-blue-500/20 border border-blue-500/50' :
                      'bg-white/10 border border-white/20'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-white font-mono text-sm">{status.phoneNumber}</p>
                      {status.error && (
                        <p className="text-red-300 text-xs mt-1">{status.error}</p>
                      )}
                    </div>
                    <div className="ml-4">
                      {status.status === 'success' && (
                        <span className="text-green-300 text-sm">Sent</span>
                      )}
                      {status.status === 'error' && (
                        <span className="text-red-300 text-sm">Failed</span>
                      )}
                      {status.status === 'sending' && (
                        <span className="text-blue-300 text-sm">Sending...</span>
                      )}
                      {status.status === 'pending' && (
                        <span className="text-slate-400 text-sm">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalized Mode: Review Summary (after completion) */}
          {mode === 'personalized' && reviewSummary && !isReviewing && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg text-center space-y-3">
              <h3 className="text-lg font-semibold text-white">Review Complete</h3>
              <div className="flex justify-center gap-6 text-sm">
                {reviewSummary.sent > 0 && (
                  <span className="text-green-300">{reviewSummary.sent} sent</span>
                )}
                {reviewSummary.skipped > 0 && (
                  <span className="text-yellow-300">{reviewSummary.skipped} skipped</span>
                )}
                {reviewSummary.errors > 0 && (
                  <span className="text-red-300">{reviewSummary.errors} failed</span>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-xs">
              Use responsibly. Sending too many messages may result in rate limiting or account restrictions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
