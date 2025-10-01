import axios, {AxiosError, AxiosResponse} from 'axios';
import {API_BASE_URL, API_TIMEOUT, getSecureHeaders} from './config';

let inMemoryToken: string | null = null;

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT.DEFAULT,
    headers: {
        'Accept': 'application/json',
        ...getSecureHeaders(),
    },
});

api.interceptors.request.use(
    async config => {
        if (inMemoryToken) {
            config.headers = {
                ...(config.headers || {}),
                Authorization: `Bearer ${inMemoryToken}`,
            } as any;
        }
        config.headers = {
            ...config.headers,
            ...getSecureHeaders(),
        } as any;
        const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
        if (!isFormData) {
            const headers = (config.headers || {}) as any;
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
            config.headers = headers;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export function setAuthToken(token: string) {
    inMemoryToken = token;
}

export function clearAuthToken() {
    inMemoryToken = null;
}

export function isTokenValid(token: string | null | undefined): boolean {
    // Implementação simplificada: apenas verifica se existe uma string não vazia
    return typeof token === 'string' && token.trim().length > 0;
}

api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            clearAuthToken();
            console.warn('Falha na autenticação - token pode ter expirado');
        }
        if (!error.response) {
            console.error('Erro de rede - verifique sua conexão');
        }
        if (error.response?.status && error.response.status >= 500) {
            console.error('Erro do servidor - tente novamente mais tarde');
        }
        return Promise.reject(error);
    }
);
