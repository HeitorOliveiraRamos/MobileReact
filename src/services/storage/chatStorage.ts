import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_STATE_KEY = 'active_chat_state';

export type PersistedMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string; // ISO string
};

export type ChatPersistedState = {
  idChat: number | null;
  messages: PersistedMessage[];
  title?: string;
};

export async function loadActiveChat(): Promise<ChatPersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_STATE_KEY);
    if (!raw) return null;
    const parsed: ChatPersistedState = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch (e) {
    if (__DEV__) console.warn('Failed to load active chat state:', e);
    return null;
  }
}

export async function saveActiveChat(state: ChatPersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAT_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    if (__DEV__) console.warn('Failed to save active chat state:', e);
  }
}

export async function clearActiveChat(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAT_STATE_KEY);
  } catch (e) {
    if (__DEV__) console.warn('Failed to clear active chat state:', e);
  }
}

