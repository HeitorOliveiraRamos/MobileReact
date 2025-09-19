/**
 * Security configuration for production deployment
 * This file contains security settings that should be customized for your specific deployment
 */

export const SecurityConfig = {
  // API Security
  api: {
    // Replace with your actual production API URL
    productionUrl: 'https://your-api-domain.com/api',

    // API timeout configurations (in milliseconds)
    timeouts: {
      default: 15000,
      upload: 60000,
      download: 30000,
    },

    // Rate limiting configuration
    rateLimiting: {
      maxRequestsPerMinute: 60,
      maxLoginAttemptsPerHour: 5,
    },

    // Security headers
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },

  // Token security
  token: {
    // Maximum age for stored tokens (in milliseconds)
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days

    // Auto-refresh token before expiration (in milliseconds)
    refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes

    // Storage encryption (basic obfuscation)
    enableEncryption: true,
  },

  // App security
  app: {
    // Force logout on app state changes after this time (in milliseconds)
    backgroundTimeout: 5 * 60 * 1000, // 5 minutes

    // Enable biometric authentication (if supported)
    enableBiometrics: false, // Set to true when implementing biometrics

    // Enable app lock/PIN (if implemented)
    enableAppLock: false, // Set to true when implementing app lock

    // Certificate pinning (if implemented)
    enableCertificatePinning: false,
  },

  // Development settings (only active in __DEV__ mode)
  development: {
    // Allow HTTP in development
    allowHttp: true,

    // Development API hosts for different platforms
    hosts: {
      android: 'http://10.0.2.2:8080', // Android emulator
      ios: 'http://localhost:8080',     // iOS simulator
      physical: 'http://192.168.1.100:8080', // Replace with your machine's IP
    },

    // Debug logging
    enableDebugLogging: true,
  },

  // Validation rules
  validation: {
    email: {
      required: true,
      format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  },
};

// Environment-specific configuration
export const getEnvironmentConfig = () => {
  if (__DEV__) {
    return {
      ...SecurityConfig,
      api: {
        ...SecurityConfig.api,
        baseUrl: SecurityConfig.development.hosts.android, // Default for development
      },
    };
  }

  return {
    ...SecurityConfig,
    api: {
      ...SecurityConfig.api,
      baseUrl: SecurityConfig.api.productionUrl,
    },
  };
};
