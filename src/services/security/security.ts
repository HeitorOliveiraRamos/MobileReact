import {Platform} from 'react-native';

// Custom base64 implementation that works reliably in React Native
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64Encode = (str: string): string => {
  let result = '';
  let i = 0;

  while (i < str.length) {
    const chr1 = str.charCodeAt(i++);
    const chr2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const chr3 = i < str.length ? str.charCodeAt(i++) : NaN;

    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    const enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      result += chars.charAt(enc1) + chars.charAt(enc2) + '==';
    } else if (isNaN(chr3)) {
      result += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + '=';
    } else {
      result += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
  }

  return result;
};

export const SecurityUtils = {
  generateDeviceId: (): string => {
    const timestamp = Date.now();
    const platform = Platform.OS;
    const version = Platform.Version;

    return base64Encode(`${platform}-${version}-${timestamp}`);
  },

  sanitizeInput: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  },

  isSecureEnvironment: (): boolean => {
    // In production, you might want to add more checks
    // like root/jailbreak detection
    return !__DEV__;
  },

  // Generate a simple hash for data integrity
  simpleHash: (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      hash = ((hash << 5) - hash) + char;
      // eslint-disable-next-line no-bitwise
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },

  // Rate limiting helper
  createRateLimiter: (maxRequests: number, windowMs: number) => {
    const requests: number[] = [];

    return () => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Remove old requests
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
      }

      // Check if we're over the limit
      if (requests.length >= maxRequests) {
        return false;
      }

      requests.push(now);
      return true;
    };
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Generate a secure random string
  generateSecureRandom: (length: number = 16): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

// Error handling utilities
export const ErrorUtils = {
  // Safe error logging that doesn't expose sensitive data
  logError: (error: Error, context?: string): void => {
    const safeError = {
      message: error.message,
      name: error.name,
      context,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
    };

    if (__DEV__) {
      console.error('Error logged:', safeError);
    }

    // In production, you might want to send this to a logging service
  },

  // Create user-friendly error messages
  getUserFriendlyError: (error: any): string => {
    if (error?.response?.status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    }
    if (error?.response?.status === 403) {
      return 'Acesso negado. Verifique suas permissões.';
    }
    if (error?.response?.status >= 500) {
      return 'Erro do servidor. Tente novamente mais tarde.';
    }
    if (error?.code === 'NETWORK_ERROR') {
      return 'Erro de conexão. Verifique sua internet.';
    }

    return 'Ocorreu um erro inesperado. Tente novamente.';
  },
};

// Validation utilities
export const ValidationUtils = {
  // Validate required fields
  validateRequired: (fields: Record<string, any>): string[] => {
    const errors: string[] = [];

    Object.entries(fields).forEach(([key, value]) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${key} é obrigatório`);
      }
    });

    return errors;
  },

  // Validate password strength
  validatePassword: (password: string): {isValid: boolean; errors: string[]} => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Senha deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }
    if (!/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
