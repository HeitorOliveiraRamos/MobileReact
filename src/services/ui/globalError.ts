export type GlobalErrorHandler = (title: string, message: string) => void;

let handler: GlobalErrorHandler | null = null;

export function setGlobalErrorHandler(h: GlobalErrorHandler | null) {
  handler = h;
}

export function notifyGlobalError(title: string, message: string) {
  try {
    if (handler) handler(title, message);
  } catch (e) {
    console.warn('[GlobalError] Failed to notify error modal:', e);
  }
}
