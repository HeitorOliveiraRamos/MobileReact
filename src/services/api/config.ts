import {Platform} from 'react-native';

const PRODUCTION_API_URL = 'https://your-api-domain.com/api';

const runtimeOverride = (globalThis as any)?.__API_OVERRIDE__ as string | undefined;

const getDevelopmentHost = () => {
    if (runtimeOverride) return runtimeOverride.replace(/\/$/, '');
    return Platform.select({
        android: 'http://localhost:8080',
        ios: 'http://localhost:8080',
        default: 'http://localhost:8080',
    }) as string;
};

export const API_BASE_URL = __DEV__ ? `${getDevelopmentHost()}/api` : PRODUCTION_API_URL;

export const getSecureHeaders = () => ({
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
});

export const API_TIMEOUT = {
    DEFAULT: 15000,
    UPLOAD: 60000,
    DOWNLOAD: 30000,
    CHAT: 300000
};
