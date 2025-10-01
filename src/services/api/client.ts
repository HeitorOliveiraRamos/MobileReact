import axios, {AxiosError, AxiosResponse} from 'axios';
import {API_BASE_URL, getSecureHeaders, API_TIMEOUT} from './config';

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

function clearAuthToken() {
  inMemoryToken = null;
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      console.warn('Authentication failed - token may be expired');
    }
    if (!error.response) {
      console.error('Network error - check your connection');
    }
    if (error.response?.status && error.response.status >= 500) {
      console.error('Server error - please try again later');
    }
    return Promise.reject(error);
  }
);
