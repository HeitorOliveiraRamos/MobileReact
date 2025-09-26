import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const TOKEN_TIMESTAMP_KEY = 'auth_token_timestamp';

// Simple encryption/decryption for token storage (basic obfuscation)
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

const encrypt = (text: string): string => {
  try {
    return base64Encode(text);
  } catch {
    // Fallback: return original text if encoding fails
    return text;
  }
};

const decrypt = (encryptedText: string): string => {
  try {
    return base64Decode(encryptedText);
  } catch {
    return encryptedText; // Fallback for non-encrypted tokens
  }
};

export async function setToken(token: string): Promise<void> {
  try {
    const encryptedToken = encrypt(token);
    const timestamp = Date.now().toString();

    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, encryptedToken),
      AsyncStorage.setItem(TOKEN_TIMESTAMP_KEY, timestamp),
    ]);
  } catch (error) {
    console.error('Failed to store auth token:', error);
    throw error;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const [encryptedToken, timestamp] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(TOKEN_TIMESTAMP_KEY),
    ]);

    if (!encryptedToken) {
      return null;
    }

    if (timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (tokenAge > maxAge) {
        await clearToken();
        return null;
      }
    }

    return decrypt(encryptedToken);
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(TOKEN_TIMESTAMP_KEY),
    ]);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
    throw error;
  }
}

// Clear all app data (useful for logout or app reset)
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Failed to clear all data:', error);
    throw error;
  }
}

// Check if stored token exists and is potentially valid
export async function hasValidToken(): Promise<boolean> {
  const token = await getToken();
  return token !== null && token.length > 0;
}
