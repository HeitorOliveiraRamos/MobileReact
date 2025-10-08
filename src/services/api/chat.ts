// filepath: c:\Users\heito\WebstormProjects\Mobile2\src\services\api\chat.ts
import { api } from './client';

export type ChatTipo = 'A' | 'U';

export type ChatMessageRequest =
  | { conteudo: string }
  | { id_chat: number; conteudo: string };

export type ChatMessageResponse = {
  id_chat: number;
  conteudo: string;
  titulo?: string; // Can be present in the first response
  tipo: ChatTipo;
};

export async function sendChatMessage(body: ChatMessageRequest) {
  const res = await api.post<ChatMessageResponse>('/usuario/chat', body);
  return res.data;
}

export async function endChat(id_chat: number) {
  // best-effort termination; return void
  await api.put('/usuario/chat', { id_chat, ativo: false });
}
