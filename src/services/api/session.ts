import {useSyncExternalStore} from 'react';

let expired = false;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach(l => {
        try {
            l();
        } catch {
        }
    });
}

export function markSessionExpired() {
    if (!expired) {
        expired = true;
        emit();
    }
}

export function clearSessionExpiredFlag() {
    if (expired) {
        expired = false;
        emit();
    }
}

export function isSessionExpired() {
    return expired;
}

export function subscribeSession(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useSessionExpired(): boolean {
    const getSnapshot = () => isSessionExpired();
    const subscribe = (cb: () => void) => subscribeSession(cb);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

