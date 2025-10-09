import {api} from './client';

export type LoginResponse = { token: string; nome: string };

export async function login(usuario: string, senha: string): Promise<LoginResponse> {
    const {data} = await api.post<LoginResponse>('/usuario/login', {usuario, senha});
    if (!data?.token) throw new Error('Resposta inválida do servidor');
    return { token: data.token, nome: data.nome ?? '' };
}
