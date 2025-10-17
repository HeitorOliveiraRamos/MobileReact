import { api } from './client';
import { API_TIMEOUT } from './config';

export type ChatTipo = 'A' | 'U';

export type ChatMessageRequest =
  | { conteudo: string }
  | { id_chat: number; conteudo: string };

export type ChatMessageResponse = {
  id_chat: number;
  conteudo: string;
  titulo?: string;
  tipo: ChatTipo;
  perguntas_rapidas?: Array<{ pergunta: string }> ;
};

export async function sendChatMessage(body: ChatMessageRequest) {
  const res = await api.post<ChatMessageResponse>('/usuario/chat', body, { timeout: API_TIMEOUT.CHAT });
  return res.data;
}

export async function endChat(id_chat: number) {
  await api.put('/usuario/chat', { id_chat, ativo: false });
}

export type UserChatListItem = { titulo: string; id_chat: number; emoji?: string };
export type ListUserChatsResponse = { chats: UserChatListItem[] };
export async function listUserChats() {
  const res = await api.get<ListUserChatsResponse>('/usuario/chat', { timeout: API_TIMEOUT.DEFAULT });
  return res.data;
}

export type ChatDetailMessage = { conteudo: string; tipo: ChatTipo };
export type ChatDetailResponse = {
  id_chat: number;
  perguntas_rapidas?: Array<{ pergunta: string }> ;
  messages: ChatDetailMessage[];
  titulo?: string;
};
export async function getChatDetails(id_chat: number) {
  const res = await api.get<ChatDetailResponse>(`/usuario/chat/${id_chat}`, { timeout: API_TIMEOUT.DEFAULT });
  return res.data;
}
