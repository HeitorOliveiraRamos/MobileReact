import {useSyncExternalStore} from 'react';

let inFlightCount = 0;
let currentChatId: number | null = null;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => {
        try { l(); } catch {}
    });
}

export function startChatRequest(idChat?: number | null) {
    inFlightCount += 1;
    if (typeof idChat !== 'undefined') currentChatId = idChat;
    emit();
}

export function endChatRequest() {
    if (inFlightCount > 0) inFlightCount -= 1;
    if (inFlightCount === 0) currentChatId = null;
    emit();
}

export function updateChatInFlightId(idChat: number | null) {
    currentChatId = idChat;
    emit();
}

export function isChatInFlight(): boolean { return inFlightCount > 0; }
export function getChatInFlightId(): number | null { return currentChatId; }

export function subscribeChatInFlight(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useChatInFlight(): boolean {
    const getSnapshot = () => isChatInFlight();
    const subscribe = (cb: () => void) => subscribeChatInFlight(cb);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useChatBusyInfo(): { busy: boolean; idChat: number | null } {
    const busy = useChatInFlight();
    const getIdSnapshot = () => getChatInFlightId();
    const subscribe = (cb: () => void) => subscribeChatInFlight(cb);
    const idChat = useSyncExternalStore(subscribe, getIdSnapshot, getIdSnapshot);
    return { busy, idChat };
}
