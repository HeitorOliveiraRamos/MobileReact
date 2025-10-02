import axios, {AxiosError, AxiosRequestHeaders, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {API_BASE_URL, API_TIMEOUT, getSecureHeaders} from './config';

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

function buildFullUrl(config: InternalAxiosRequestConfig): string {
    const base = (config.baseURL || '').replace(/\/$/, '');
    const url = (config.url || '').replace(/^\//, '');
    let full = base ? `${base}/${url}` : url;
    if (config.params && typeof config.params === 'object') {
        const usp = new URLSearchParams();
        Object.entries(config.params).forEach(([k, v]) => {
            if (v == null) return;
            if (Array.isArray(v)) v.forEach(val => usp.append(k, String(val))); else usp.append(k, String(v));
        });
        const qs = usp.toString();
        if (qs) full += (full.includes('?') ? '&' : '?') + qs;
    }
    return full;
}

function escapeDoubleQuotes(str: string) {
    return str.replace(/"/g, '\\"');
}

function serializeHeadersForCurl(headers?: AxiosRequestHeaders): string[] {
    if (!headers) return [];
    const out: string[] = [];
    Object.entries(headers as Record<string, any>).forEach(([k, v]) => {
        if (v == null) return;
        if (/^content-length$/i.test(k)) return;
        out.push(`-H "${k}: ${String(v)}"`);
    });
    return out;
}

function isLikelyFormData(data: any): boolean {
    return typeof FormData !== 'undefined' && data instanceof FormData;
}

function extractFormDataParts(fd: FormData): Array<{ key: string; value: any }> {
    const parts: Array<{ key: string; value: any }> = [];
    const anyFd: any = fd as any;
    if (typeof anyFd.entries === 'function') {
        try {
            for (const [k, v] of anyFd.entries()) parts.push({key: k, value: v});
            return parts;
        } catch {
        }
    }
    if (Array.isArray(anyFd._parts)) {
        for (const p of anyFd._parts) if (Array.isArray(p) && p.length >= 2) parts.push({key: p[0], value: p[1]});
    }
    return parts;
}

function buildCurlCommand(config: InternalAxiosRequestConfig): string {
    const method = (config.method || 'GET').toUpperCase();
    const url = buildFullUrl(config);
    const segments: string[] = ['curl', '-X', method];
    segments.push(...serializeHeadersForCurl(config.headers as AxiosRequestHeaders));
    const data = config.data as any;
    if (data != null) {
        if (isLikelyFormData(data)) {
            extractFormDataParts(data).forEach(p => {
                const val = p.value;
                if (val && typeof val === 'object' && 'uri' in val && 'name' in val) {
                    let fileRef = (val as any).uri as string;
                    if (fileRef.startsWith('content://')) fileRef = `@/CAMINHO/LOCAL/SUBSTITUIR/${(val as any).name}`; else if (fileRef.startsWith('file://')) fileRef = '@' + fileRef.replace('file://', ''); else fileRef = `@${fileRef}`;
                    segments.push(`-F "${p.key}=${fileRef}"`);
                } else segments.push(`-F "${p.key}=${String(val)}"`);
            });
        } else if (typeof data === 'object' && !(data instanceof ArrayBuffer)) {
            try {
                const json = JSON.stringify(data);
                segments.push(`--data-raw "${escapeDoubleQuotes(json)}"`);
            } catch {
                segments.push('--data-raw "{\"_unserializavel\":true}"');
            }
        } else if (typeof data === 'string') segments.push(`--data-raw "${escapeDoubleQuotes(data)}"`);
    }
    segments.push(`"${url}"`);
    const multiLine = segments.map((seg, i) => i === 0 ? seg : '  ' + seg).join(' \\\n');
    const oneLine = segments.join(' ');
    return `${multiLine}\n\n# One-line (Windows cmd friendly):\n${oneLine}`;
}

api.interceptors.response.use(
    (response: AxiosResponse) => {
        const duration = response.config.metadata?.start ? Date.now() - response.config.metadata.start : undefined;
        debugLog('←', response.config.method?.toUpperCase(), response.status, response.config.baseURL + (response.config.url || ''), duration ? `${duration}ms` : '');
        return response;
    },
    (error: AxiosError) => {
        const cfg = error.config as InternalAxiosRequestConfig | undefined;
        const duration = cfg?.metadata?.start ? Date.now() - (cfg.metadata.start) : undefined;
        let curlCmd: string | undefined;
        if (cfg) {
            try {
                curlCmd = buildCurlCommand(cfg);
                (error as any).__curl = curlCmd;
            } catch (e) {
                console.warn('[API] Falha ao gerar curl:', (e as any)?.message);
            }
        }
        if (!error.response) debugLog('✗ NETWORK', cfg?.method?.toUpperCase(), cfg?.baseURL + (cfg?.url || ''), duration ? `${duration}ms` : '', error.message); else {
            debugLog('✗ RESPONSE', error.response.status, cfg?.method?.toUpperCase(), cfg?.baseURL + (cfg?.url || ''), duration ? `${duration}ms` : '');
            debugLog('  response headers:', error.response.headers);
            debugLog('  response data:', error.response.data);
        }
        if (curlCmd) console.log(curlCmd);
        if (error.response?.status === 401) {
            clearAuthToken();
            console.warn('Falha na autenticação');
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
