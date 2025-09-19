import axios, {AxiosError, AxiosResponse} from 'axios';
import {API_BASE_URL, getSecureHeaders, API_TIMEOUT} from './config';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64Decode = (str: string): string => {
  let result = '';
  let i = 0;

  str = str.replace(/[^A-Za-z0-9+/]/g, '');

  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    result += String.fromCharCode(chr1);

    if (enc3 !== 64) {
      result += String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      result += String.fromCharCode(chr3);
    }
  }

  return result;
};

let inMemoryToken: string | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT.DEFAULT,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...getSecureHeaders(),
  },
});

// Request interceptor with security enhancements
api.interceptors.request.use(
  async config => {
    // Attach bearer token if available
    if (inMemoryToken) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${inMemoryToken}`,
      } as any;
    }

    // Add security headers
    config.headers = {
      ...config.headers,
      ...getSecureHeaders(),
    } as any;

    // Ensure JSON content type unless explicitly overridden
    if (!config.headers || !(config.headers as any)['Content-Type']) {
      (config.headers as any)['Content-Type'] = 'application/json';
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor with error handling and token validation
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      clearAuthToken();
      // You might want to trigger a logout event here
      console.warn('Authentication failed - token may be expired');
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error - check your connection');
    }

    // Handle server errors
    if (error.response?.status && error.response.status >= 500) {
      console.error('Server error - please try again later');
    }

    return Promise.reject(error);
  }
);

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

// Helper function to check if token is valid (basic validation)
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode payload to check expiration using custom base64 decode
    const payload = JSON.parse(base64Decode(parts[1]));
    const now = Math.floor(Date.now() / 1000);

    return payload.exp ? payload.exp > now : true;
  } catch {
    return false;
  }
}
