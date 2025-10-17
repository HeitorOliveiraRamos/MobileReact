import { sendChatMessage, ChatMessageResponse } from '../api/chat';
import { loadActiveChat, saveActiveChat, PersistedMessage } from '../storage/chatStorage';

function makePersistedMessage(idPrefix: string, text: string, isUser: boolean): PersistedMessage {
  return {
    id: `${idPrefix}-${Date.now()}`,
    text,
    isUser,
    timestamp: new Date().toISOString(),
  };
}

export async function sendMessagePersisting(params: { idChat: number | null; text: string }): Promise<ChatMessageResponse> {
  const { idChat, text } = params;
  try {
    const existing = await loadActiveChat();
    const userMsg = makePersistedMessage('user', text, true);
    const next = existing && (existing.idChat === idChat || existing.idChat === null)
      ? { ...existing, messages: [...existing.messages, userMsg] }
      : { idChat, messages: [userMsg] };
    await saveActiveChat(next);
  } catch {}

  const response = await sendChatMessage(idChat != null ? { id_chat: idChat, conteudo: text } : { conteudo: text });

  try {
    const aiMsg = makePersistedMessage('ai', response.conteudo ?? '', (response.tipo || 'A') === 'U');
    const existing = await loadActiveChat();
    const newId = typeof response.id_chat === 'number' ? response.id_chat : idChat;
    const quick = (response.perguntas_rapidas || []).map(p => p.pergunta).filter(Boolean);
    const next = existing && (existing.idChat === idChat || existing.idChat === null)
      ? {
          ...existing,
          idChat: newId ?? existing.idChat ?? null,
          title: existing.title || response.titulo,
          quickQuestions: quick,
          messages: [...existing.messages, aiMsg],
        }
      : {
          idChat: newId ?? null,
          title: response.titulo,
          quickQuestions: quick,
          messages: [aiMsg],
        };
    await saveActiveChat(next);
  } catch {}

  return response;
}

