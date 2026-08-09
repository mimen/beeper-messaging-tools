import { useState, useEffect } from 'react';
import type { BeeperClient } from '../beeper-api';
import { AirtableClient } from '../airtable-api';
import type { ReviewContact, ReviewSummary } from '../types/messaging';
import { buildPhoneChatMap, findChatByPhone, findOrCreateChat, type PhoneToChatMap } from '../utils/chat-resolver';
import { ReviewProgress } from './ReviewProgress';
import { ContactReviewCard } from './ContactReviewCard';

interface PersonalizedReviewProps {
  client: BeeperClient;
  gmessagesAccountID: string;
  contacts: ReviewContact[];
  onComplete: (summary: ReviewSummary) => void;
  onCancel: () => void;
}

export function PersonalizedReview({
  client,
  gmessagesAccountID,
  contacts: initialContacts,
  onComplete,
  onCancel,
}: PersonalizedReviewProps) {
  const [contacts, setContacts] = useState<ReviewContact[]>(initialContacts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatCache, setChatCache] = useState<PhoneToChatMap | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [airtableClient] = useState(() => new AirtableClient());

  // Fetch all chats once on mount and resolve chatIDs
  useEffect(() => {
    loadChatsAndResolve();
  }, []);

  const loadChatsAndResolve = async () => {
    setLoadingChats(true);

    try {
      const allChats = await client.searchAllChats({
        accountIDs: [gmessagesAccountID],
      });

      const cache = buildPhoneChatMap(allChats);
      setChatCache(cache);

      // Resolve chatIDs for all contacts
      setContacts(prev =>
        prev.map(contact => ({
          ...contact,
          chatID: findChatByPhone(contact.phoneNumber, cache),
        }))
      );
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  const getSummary = (): ReviewSummary => {
    return {
      total: contacts.length,
      sent: contacts.filter(c => c.status === 'sent').length,
      skipped: contacts.filter(c => c.status === 'skipped').length,
      errors: contacts.filter(c => c.status === 'error').length,
    };
  };

  const isComplete = currentIndex >= contacts.length;
  const currentContact = !isComplete ? contacts[currentIndex] : null;
  const summary = getSummary();
  const hasStartedSending = summary.sent > 0;

  const advanceToNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= contacts.length) {
      onComplete(getSummary());
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleSend = async (message: string, advance: boolean) => {
    if (!chatCache || !currentContact) return;

    const chatID = await findOrCreateChat(
      client,
      gmessagesAccountID,
      currentContact.phoneNumber,
      chatCache,
    );

    await client.sendMessage({ chatID, text: message });

    // Update Airtable if applicable
    if (currentContact.airtableRecordId) {
      try {
        await airtableClient.updateHumanRecord(currentContact.airtableRecordId, {
          'UW26 Intro Text Sent': true,
        });
      } catch (err) {
        console.error('Failed to update Airtable:', err);
      }
    }

    // Update contact status and store resolved chatID
    setContacts(prev =>
      prev.map((c, i) => i === currentIndex ? { ...c, status: 'sent', chatID } : c)
    );

    if (advance) {
      advanceToNext();
    }
  };

  const handleSkip = () => {
    setContacts(prev =>
      prev.map((c, i) => i === currentIndex ? { ...c, status: 'skipped' } : c)
    );
    advanceToNext();
  };

  const handleCancel = () => {
    if (hasStartedSending) {
      const confirmed = window.confirm(
        `You've already sent ${summary.sent} message(s). Are you sure you want to cancel the review?`
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  if (loadingChats) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-300 animate-pulse">Loading conversations...</p>
        <p className="text-slate-500 text-sm mt-2">Fetching your Google Messages chats</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="space-y-4">
        <ReviewProgress currentIndex={contacts.length - 1} summary={summary} />

        <div className="p-6 bg-white/5 rounded-lg text-center space-y-3">
          <h3 className="text-xl font-bold text-white">Review Complete</h3>
          <div className="flex justify-center gap-6 text-sm">
            {summary.sent > 0 && (
              <span className="text-green-300">{summary.sent} sent</span>
            )}
            {summary.skipped > 0 && (
              <span className="text-yellow-300">{summary.skipped} skipped</span>
            )}
            {summary.errors > 0 && (
              <span className="text-red-300">{summary.errors} failed</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <ReviewProgress currentIndex={currentIndex} summary={summary} />

      {/* Current contact review card */}
      {currentContact && (
        <ContactReviewCard
          key={currentContact.phoneNumber}
          contact={currentContact}
          client={client}
          onSend={handleSend}
          onSkip={handleSkip}
        />
      )}

      {/* Cancel button */}
      <div className="flex justify-end">
        <button
          onClick={handleCancel}
          className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          Cancel Review
        </button>
      </div>
    </div>
  );
}
