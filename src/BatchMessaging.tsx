import { useState } from 'react';
import { BeeperClient } from './beeper-api';

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
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);

  const parsePhoneNumbers = (input: string): string[] => {
    return input
      .split(/[\n,]+/)
      .map(num => num.trim())
      .filter(num => num.length > 0)
      .map(num => {
        // Add + prefix if not present
        if (!num.startsWith('+')) {
          return `+${num}`;
        }
        return num;
      });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const sendBatchMessages = async () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    const numbers = parsePhoneNumbers(phoneNumbers);
    if (numbers.length === 0) {
      alert('Please enter at least one phone number');
      return;
    }

    setIsSending(true);
    const statuses: MessageStatus[] = numbers.map(num => ({
      phoneNumber: num,
      status: 'pending',
    }));
    setMessageStatuses(statuses);

    for (let i = 0; i < numbers.length; i++) {
      const phoneNumber = numbers[i];

      // Update status to sending
      setMessageStatuses(prev =>
        prev.map((s, idx) => idx === i ? { ...s, status: 'sending' } : s)
      );

      try {
        console.log(`Processing phone number: ${phoneNumber}`);

        // Search all Google Messages chats to find one with this phone number
        console.log(`Searching for existing chat with ${phoneNumber}`);
        const chatsResult = await client.searchChats({
          accountIDs: [gmessagesAccountID],
          limit: 100, // Adjust if you have more chats
        });

        let targetChatID: string | null = null;

        // Check each chat's participants for matching phone number
        // Only look at single (1-on-1) chats
        for (const chat of chatsResult.items) {
          // Skip group chats
          if (chat.type !== 'single') {
            continue;
          }

          if (chat.participants?.items) {
            const hasMatchingPhone = chat.participants.items.some(
              (participant: any) =>
                participant.phoneNumber === phoneNumber && !participant.isSelf
            );

            if (hasMatchingPhone) {
              targetChatID = chat.id;
              console.log(`Found existing single chat: ${targetChatID} for ${phoneNumber}`);
              break;
            }
          }
        }

        if (targetChatID) {
          // Chat exists, send message
          console.log(`Sending message to existing chat ${targetChatID}`);
          await client.sendMessage({
            chatID: targetChatID,
            text: message,
          });
        } else {
          // Chat doesn't exist, create it first
          console.log(`No existing chat found. Creating new chat for ${phoneNumber}`);
          const newChat = await client.createChat({
            accountID: gmessagesAccountID,
            type: 'single',
            participantIDs: [phoneNumber],
          });

          console.log(`Chat created: ${newChat.chatID}, now sending message`);

          // Now send the message to the newly created chat
          await client.sendMessage({
            chatID: newChat.chatID,
            text: message,
          });
        }

        console.log(`Message sent successfully to ${phoneNumber}`);

        // Update status to success
        setMessageStatuses(prev =>
          prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s)
        );

      } catch (error) {
        console.error(`Failed to send message to ${phoneNumber}:`, error);

        // Update status to error
        setMessageStatuses(prev =>
          prev.map((s, idx) => idx === i ? {
            ...s,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          } : s)
        );
      }

      // Wait 10 seconds before next message (except for the last one)
      if (i < numbers.length - 1) {
        console.log('Waiting 10 seconds before next message...');
        await sleep(10000);
      }
    }

    setIsSending(false);
    console.log('Batch messaging complete');
  };

  const resetForm = () => {
    setPhoneNumbers('');
    setMessage('');
    setMessageStatuses([]);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Batch Message Sender</h2>
      <p className="text-slate-300 text-sm mb-4">
        Send messages to multiple phone numbers via Google Messages. 10-second delay between each message.
      </p>

      <div className="space-y-4">
        {/* Phone Numbers Input */}
        <div>
          <label htmlFor="phoneNumbers" className="block text-sm font-medium text-slate-200 mb-2">
            Phone Numbers (one per line or comma-separated)
          </label>
          <textarea
            id="phoneNumbers"
            value={phoneNumbers}
            onChange={(e) => setPhoneNumbers(e.target.value)}
            placeholder="+19259976370&#10;+16198572209&#10;+14155552671"
            disabled={isSending}
            className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={5}
          />
          <p className="text-xs text-slate-400 mt-1">
            Auto-adds + prefix if missing
          </p>
        </div>

        {/* Message Input */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-200 mb-2">
            Message
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
          <button
            onClick={sendBatchMessages}
            disabled={isSending}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isSending ? 'Sending...' : 'Send Messages'}
          </button>

          {messageStatuses.length > 0 && !isSending && (
            <button
              onClick={resetForm}
              className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Status Display */}
        {messageStatuses.length > 0 && (
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
                      <span className="text-green-300 text-sm">✓ Sent</span>
                    )}
                    {status.status === 'error' && (
                      <span className="text-red-300 text-sm">✗ Failed</span>
                    )}
                    {status.status === 'sending' && (
                      <span className="text-blue-300 text-sm">⟳ Sending...</span>
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

        {/* Warning */}
        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-200 text-xs">
            ⚠️ Use responsibly. Sending too many messages may result in rate limiting or account restrictions.
          </p>
        </div>
      </div>
    </div>
  );
}
