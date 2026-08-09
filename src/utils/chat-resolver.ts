import type { BeeperChat, BeeperClient } from '../beeper-api';
import { formatPhoneNumber } from './phone';

export type PhoneToChatMap = Map<string, string>;

/**
 * Build a phone→chatID lookup map from a list of chats.
 * Only includes single (1-on-1) chats.
 */
export function buildPhoneChatMap(chats: BeeperChat[]): PhoneToChatMap {
  const map: PhoneToChatMap = new Map();

  for (const chat of chats) {
    if (chat.type !== 'single') continue;

    for (const participant of chat.participants?.items ?? []) {
      if (participant.phoneNumber && !participant.isSelf) {
        map.set(formatPhoneNumber(participant.phoneNumber), chat.id);
      }
    }
  }

  return map;
}

/**
 * Find an existing chat ID for a phone number using a pre-built cache.
 */
export function findChatByPhone(
  phoneNumber: string,
  cache: PhoneToChatMap,
): string | null {
  return cache.get(phoneNumber) ?? null;
}

/**
 * Find an existing chat or create a new one for a phone number.
 * Returns the chat ID.
 */
export async function findOrCreateChat(
  client: BeeperClient,
  accountID: string,
  phoneNumber: string,
  cache: PhoneToChatMap,
): Promise<string> {
  const existingChatID = findChatByPhone(phoneNumber, cache);
  if (existingChatID) return existingChatID;

  const newChat = await client.createChat({
    accountID,
    type: 'single',
    participantIDs: [phoneNumber],
  });

  // Update cache so subsequent lookups find this chat
  cache.set(phoneNumber, newChat.chatID);
  return newChat.chatID;
}
