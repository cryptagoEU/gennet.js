import type {JsonRpcNotification, Provider} from '../src/types.js';

/**
 * Mock-Provider für Tests — zeichnet alle Requests auf und gibt konfigurierbare Responses zurück.
 */
export class MockProvider implements Provider {
    public calls: Array<{ method: string; params?: Record<string, unknown> | unknown[] }> = [];
    public responses = new Map<string, unknown>();
    private listeners = new Set<(notification: JsonRpcNotification) => void>();

    get connected(): boolean {
        return true;
    }

    /** Setzt die Response für eine bestimmte Methode. */
    setResponse(method: string, response: unknown): void {
        this.responses.set(method, response);
    }

    async request(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown> {
        this.calls.push({method, params});
        const response = this.responses.get(method);
        if (response === undefined) {
            throw new Error(`Keine Mock-Response für ${method}`);
        }
        return response;
    }

    on(_event: 'notification', listener: (notification: JsonRpcNotification) => void): void {
        this.listeners.add(listener);
    }

    off(_event: 'notification', listener: (notification: JsonRpcNotification) => void): void {
        this.listeners.delete(listener);
    }

    /** Simuliert eine Push-Notification (für Subscription-Tests). */
    emit(notification: JsonRpcNotification): void {
        for (const listener of this.listeners) {
            listener(notification);
        }
    }

    disconnect(): void {}
}
