import type {
    JsonRpcNotification,
    JsonRpcResponse,
    JsonRpcErrorResponse,
    Provider,
    ProviderEvent,
    ProviderEventListener,
    ReconnectOptions,
} from '../types.js';
import {RpcError} from '../types.js';

const DEFAULT_TIMEOUT = 30_000;

const DEFAULT_RECONNECT: Required<ReconnectOptions> = {
    enabled: true,
    maxRetries: 5,
    delay: 1000,
    maxDelay: 30_000,
};

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket Provider — nutzt native WebSocket API (Browser + Node 22+).
 * Unterstützt Subscriptions via Push-Notifications und Auto-Reconnect.
 */
export class WebSocketProvider implements Provider {
    private readonly url: string;
    private readonly timeout: number;
    private readonly reconnectOpts: Required<ReconnectOptions>;
    private ws: WebSocket | null = null;
    private requestId = 0;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private manualDisconnect = false;
    private pending = new Map<string | number, PendingRequest>();

    // Typisierte Event-Listener
    private notificationListeners = new Set<(notification: JsonRpcNotification) => void>();
    private connectListeners = new Set<() => void>();
    private disconnectListeners = new Set<() => void>();
    private errorListeners = new Set<(error: Error) => void>();
    private connectPromise: Promise<void> | null = null;

    constructor(url: string, options?: { timeout?: number; reconnect?: ReconnectOptions }) {
        this.url = url;
        this.timeout = options?.timeout ?? DEFAULT_TIMEOUT;
        this.reconnectOpts = {...DEFAULT_RECONNECT, ...options?.reconnect};
    }

    get connected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    async connect(): Promise<void> {
        if (this.connected) return;
        if (this.connectPromise) return this.connectPromise;

        this.manualDisconnect = false;

        this.connectPromise = new Promise<void>((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.connectPromise = null;
                this.reconnectAttempts = 0;
                this.emit('connect');
                resolve();
            };

            this.ws.onerror = (ev) => {
                this.connectPromise = null;
                const error = new Error(`WebSocket-Verbindung fehlgeschlagen: ${this.url} (${ev})`);
                this.emit('error', error);
                reject(error);
            };

            this.ws.onmessage = (ev) => {
                this.handleMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
            };

            this.ws.onclose = () => {
                this.connectPromise = null;
                this.ws = null;

                // Alle offenen Requests ablehnen
                for (const [id, req] of this.pending) {
                    clearTimeout(req.timer);
                    req.reject(new Error('WebSocket-Verbindung geschlossen'));
                    this.pending.delete(id);
                }

                this.emit('disconnect');

                // Auto-Reconnect wenn nicht manuell getrennt
                if (!this.manualDisconnect && this.reconnectOpts.enabled) {
                    this.scheduleReconnect();
                }
            };
        });

        return this.connectPromise;
    }

    async request(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown> {
        if (!this.connected) {
            await this.connect();
        }

        const id = ++this.requestId;
        const payload = JSON.stringify({jsonrpc: '2.0', id, method, params});

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new RpcError(`Timeout nach ${this.timeout}ms für ${method}`, -32000));
            }, this.timeout);

            this.pending.set(id, {resolve, reject, timer});
            this.ws!.send(payload);
        });
    }

    on<E extends ProviderEvent>(event: E, listener: ProviderEventListener<E>): void {
        this.getListenerSet(event).add(listener as never);
    }

    off<E extends ProviderEvent>(event: E, listener: ProviderEventListener<E>): void {
        this.getListenerSet(event).delete(listener as never);
    }

    disconnect(): void {
        this.manualDisconnect = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ── Private ────────────────────────────────────────────────

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.reconnectOpts.maxRetries) {
            this.emit('error', new Error(
                `Reconnect fehlgeschlagen nach ${this.reconnectOpts.maxRetries} Versuchen`,
            ));
            return;
        }

        const delay = Math.min(
            this.reconnectOpts.delay * Math.pow(2, this.reconnectAttempts),
            this.reconnectOpts.maxDelay,
        );
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((err: unknown) => {
                this.emit('error', err instanceof Error ? err : new Error(String(err)));
            });
        }, delay);
    }

    private emit(event: 'connect' | 'disconnect'): void;
    private emit(event: 'error', error: Error): void;
    private emit(event: 'notification', notification: JsonRpcNotification): void;
    private emit(event: ProviderEvent, data?: unknown): void {
        switch (event) {
            case 'connect':
                for (const l of this.connectListeners) l();
                break;
            case 'disconnect':
                for (const l of this.disconnectListeners) l();
                break;
            case 'error':
                for (const l of this.errorListeners) l(data as Error);
                break;
            case 'notification':
                for (const l of this.notificationListeners) l(data as JsonRpcNotification);
                break;
        }
    }

    private getListenerSet(event: ProviderEvent): Set<(...args: never[]) => void> {
        switch (event) {
            case 'notification': return this.notificationListeners as Set<(...args: never[]) => void>;
            case 'connect': return this.connectListeners as Set<(...args: never[]) => void>;
            case 'disconnect': return this.disconnectListeners as Set<(...args: never[]) => void>;
            case 'error': return this.errorListeners as Set<(...args: never[]) => void>;
        }
    }

    private handleMessage(raw: string): void {
        let msg: Record<string, unknown>;
        try {
            msg = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return;
        }

        // JSON-RPC Response (hat id + result oder error)
        if (msg.id !== undefined && ('result' in msg || 'error' in msg)) {
            const response = msg as unknown as JsonRpcResponse;
            const pending = this.pending.get(response.id);
            if (pending) {
                clearTimeout(pending.timer);
                this.pending.delete(response.id);

                if ('error' in response) {
                    const err = (response as JsonRpcErrorResponse).error;
                    pending.reject(new RpcError(err.message, err.code, err.data));
                } else {
                    pending.resolve(response.result);
                }
            }
            return;
        }

        // JSON-RPC Notification (kein id, hat method) → Listener
        if ('method' in msg && 'params' in msg) {
            this.emit('notification', msg as unknown as JsonRpcNotification);
        }
    }
}