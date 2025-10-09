import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const NOME_KEY = 'user_nome';

export async function setToken(token: string): Promise<void> {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Falha ao armazenar token:', error);
        throw error;
    }
}

export async function clearToken(): Promise<void> {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error('Falha ao limpar token:', error);
        throw error;
    }
}

export async function getToken(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Falha ao obter token:', error);
        return null;
    }
}

export async function setNome(nome: string): Promise<void> {
    try {
        await AsyncStorage.setItem(NOME_KEY, nome);
    } catch (error) {
        console.error('Falha ao armazenar nome:', error);
        throw error;
    }
}

export async function getNome(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(NOME_KEY);
    } catch (error) {
        console.error('Falha ao obter nome:', error);
        return null;
    }
}

export async function clearNome(): Promise<void> {
    try {
        await AsyncStorage.removeItem(NOME_KEY);
    } catch (error) {
        console.error('Falha ao limpar nome:', error);
        throw error;
    }
}
