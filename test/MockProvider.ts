import type {JsonRpcNotification, Provider, ProviderEvent, ProviderEventListener} from '../src/types.js';

/**
 * Mock-Provider für Tests — zeichnet alle Requests auf und gibt konfigurierbare Responses zurück.
 */
export class MockProvider implements Provider {
    public calls: Array<{ method: string; params?: Record<string, unknown> | unknown[] }> = [];
    public responses = new Map<string, unknown>();
    private notificationListeners = new Set<(notification: JsonRpcNotification) => void>();
    private connectListeners = new Set<() => void>();
    private disconnectListeners = new Set<() => void>();
    private errorListeners = new Set<(error: Error) => void>();

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

    on<E extends ProviderEvent>(event: E, listener: ProviderEventListener<E>): void {
        switch (event) {
            case 'notification': this.notificationListeners.add(listener as (notification: JsonRpcNotification) => void); break;
            case 'connect': this.connectListeners.add(listener as () => void); break;
            case 'disconnect': this.disconnectListeners.add(listener as () => void); break;
            case 'error': this.errorListeners.add(listener as (error: Error) => void); break;
        }
    }

    off<E extends ProviderEvent>(event: E, listener: ProviderEventListener<E>): void {
        switch (event) {
            case 'notification': this.notificationListeners.delete(listener as (notification: JsonRpcNotification) => void); break;
            case 'connect': this.connectListeners.delete(listener as () => void); break;
            case 'disconnect': this.disconnectListeners.delete(listener as () => void); break;
            case 'error': this.errorListeners.delete(listener as (error: Error) => void); break;
        }
    }

    /** Simuliert eine Push-Notification (für Subscription-Tests). */
    emit(notification: JsonRpcNotification): void {
        for (const listener of this.notificationListeners) {
            listener(notification);
        }
    }

    disconnect(): void {}
}