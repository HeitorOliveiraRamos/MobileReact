import axios, {AxiosError, AxiosRequestHeaders, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {API_BASE_URL, API_TIMEOUT, getSecureHeaders} from './config';
import { markSessionExpired } from './session';
import { notifyGlobalError } from '../ui/globalError';

let inMemoryToken: string | null = null;

const DEFAULT_DEBUG = __DEV__;
if (typeof (globalThis as any).__API_DEBUG__ === 'undefined') {
    (globalThis as any).__API_DEBUG__ = DEFAULT_DEBUG;
}

function isDebugEnabled() {
    return !!(globalThis as any).__API_DEBUG__;
}

function debugLog(...args: any[]) {
    if (isDebugEnabled()) console.log('[API]', ...args);
}

function extractFormDataDebug(data: any) {
    if (!(typeof FormData !== 'undefined' && data instanceof FormData)) return data;
    const out: Record<string, any[]> = {};
    const anyData: any = data as any;
    try {
        if (typeof anyData.entries === 'function') {
            for (const [k, v] of anyData.entries()) {
                if (!out[k]) out[k] = [];
                if (typeof v === 'object' && v && 'uri' in v) out[k].push({
                    ...v,
                    __meta: 'file part'
                }); else out[k].push(v);
            }
            return {__type: 'FormData', parts: out};
        }
    } catch {
    }
    if (Array.isArray(anyData._parts)) {
        for (const part of anyData._parts) {
            if (!Array.isArray(part) || part.length < 2) continue;
            const [k, v] = part;
            if (!out[k]) out[k] = [];
            if (v && typeof v === 'object' && 'uri' in v) out[k].push({...v, __meta: 'file part'}); else out[k].push(v);
        }
        return {__type: 'FormData', parts: out};
    }
    return {__type: 'FormData', note: 'NaoSerializavel'};
}

declare module 'axios' {
    interface InternalAxiosRequestConfig {
        metadata?: { start?: number }
    }
}

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT.DEFAULT,
    headers: {Accept: 'application/json', ...getSecureHeaders()}
});

function isRNFormData(data: any): boolean {
    if (!data) return false;
    const isStd = typeof FormData !== 'undefined' && data instanceof FormData;
    const hasParts = typeof data === 'object' && typeof (data as any).append === 'function' && Array.isArray((data as any)._parts);
    return isStd || hasParts;
}

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        config.metadata = {start: Date.now()};
        const baseHeaders: AxiosRequestHeaders = (config.headers || {}) as AxiosRequestHeaders;
        if (inMemoryToken) baseHeaders['Authorization'] = `Bearer ${inMemoryToken}`;
        Object.entries(getSecureHeaders()).forEach(([k, v]) => {
            baseHeaders[k] = v as any;
        });
        const isFormData = isRNFormData(config.data);
        if (isFormData) baseHeaders['Content-Type'] = 'multipart/form-data'; else if (!baseHeaders['Content-Type']) baseHeaders['Content-Type'] = 'application/json';
        config.headers = baseHeaders;
        debugLog('→', config.method?.toUpperCase(), config.baseURL + (config.url || ''));
        if (config.params) debugLog('  params:', config.params);
        if (config.headers) {
            const cloned = {...(config.headers as any)};
            if (cloned.Authorization) cloned.Authorization = String(cloned.Authorization).replace(/Bearer\s+(.{5}).+/, 'Bearer $1***');
            debugLog('  headers:', cloned);
        }
        if (typeof config.data !== 'undefined') debugLog('  body:', isFormData ? extractFormDataDebug(config.data) : config.data);
        return config;
    },
    error => {
        debugLog('✗ REQUEST SETUP ERROR', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response: AxiosResponse) => {
        const duration = response.config.metadata?.start ? Date.now() - response.config.metadata.start : undefined;
        debugLog('←', response.config.method?.toUpperCase(), response.status, response.config.baseURL + (response.config.url || ''), duration ? `${duration}ms` : '');
        return response;
    },
    (error: AxiosError) => {
        const cfg = error.config as InternalAxiosRequestConfig | undefined;
        const duration = cfg?.metadata?.start ? Date.now() - (cfg.metadata.start) : undefined;
        if (!error.response) debugLog('✗ NETWORK', cfg?.method?.toUpperCase(), cfg?.baseURL + (cfg?.url || ''), duration ? `${duration}ms` : '', error.message); else {
            debugLog('✗ RESPONSE', error.response.status, cfg?.method?.toUpperCase(), cfg?.baseURL + (cfg?.url || ''), duration ? `${duration}ms` : '');
            debugLog('  response headers:', error.response.headers);
            debugLog('  response data:', error.response.data);
        }
        const status = error.response?.status;
        const url = (cfg?.url || '') + '';
        if (status === 401) {
            const isLoginEndpoint = typeof url === 'string' && url.includes('/usuario/login');
            if (isLoginEndpoint) {
            } else {
                clearAuthToken();
                markSessionExpired();
                console.warn('Sessão expirada');
            }
        } else if (status && status >= 400) {
            const data: any = error.response?.data;
            let title: string | undefined;
            let message: string | undefined;
            if (data && typeof data === 'object') {
                if (typeof data.error === 'string' && data.error.trim()) title = data.error.trim();
                if (typeof data.message === 'string' && data.message.trim()) message = data.message.trim();
            } else if (typeof data === 'string' && data.trim()) {
                message = data.trim();
            }
            if (!title) title = status >= 500 ? 'Erro do servidor' : 'Erro';
            if (!message) message = `Requisição falhou com status ${status}`;
            try { notifyGlobalError(title, message); } catch {}
        }
        if (!error.response) console.error('Erro de rede');
        if (error.response?.status && error.response.status >= 500) console.error('Erro do servidor');
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
    return typeof token === 'string' && token.trim().length > 0;
}
