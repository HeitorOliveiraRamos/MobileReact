import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

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
        return null; // retorna null para não quebrar fluxo
    }
}
