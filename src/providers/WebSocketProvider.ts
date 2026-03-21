import type {JsonRpcNotification, JsonRpcResponse, JsonRpcErrorResponse, Provider} from '../types.js';
import {RpcError} from '../types.js';

const DEFAULT_TIMEOUT = 30_000;

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket Provider — nutzt native WebSocket API (Browser + Node 22+).
 * Unterstützt Subscriptions via Push-Notifications.
 */
export class WebSocketProvider implements Provider {
    private readonly url: string;
    private readonly timeout: number;
    private ws: WebSocket | null = null;
    private requestId = 0;
    private pending = new Map<string | number, PendingRequest>();
    private listeners = new Set<(notification: JsonRpcNotification) => void>();
    private connectPromise: Promise<void> | null = null;

    constructor(url: string, timeout = DEFAULT_TIMEOUT) {
        this.url = url;
        this.timeout = timeout;
    }

    get connected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        // Verhindert doppelte connect()-Aufrufe
        if (this.connectPromise) return this.connectPromise;

        this.connectPromise = new Promise<void>((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.connectPromise = null;
                resolve();
            };

            this.ws.onerror = (ev) => {
                this.connectPromise = null;
                reject(new Error(`WebSocket-Verbindung fehlgeschlagen: ${this.url} (${ev})`));
            };

            this.ws.onmessage = (ev) => {
                this.handleMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
            };

            this.ws.onclose = () => {
                this.connectPromise = null;
                // Alle offenen Requests ablehnen
                for (const [id, req] of this.pending) {
                    clearTimeout(req.timer);
                    req.reject(new Error('WebSocket-Verbindung geschlossen'));
                    this.pending.delete(id);
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

    on(_event: 'notification', listener: (notification: JsonRpcNotification) => void): void {
        this.listeners.add(listener);
    }

    off(_event: 'notification', listener: (notification: JsonRpcNotification) => void): void {
        this.listeners.delete(listener);
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // ── Private ────────────────────────────────────────────────

    private handleMessage(raw: string): void {
        let msg: Record<string, unknown>;
        try {
            msg = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return; // Ungültige Nachricht ignorieren
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
            const notification = msg as unknown as JsonRpcNotification;
            for (const listener of this.listeners) {
                listener(notification);
            }
        }
    }
}