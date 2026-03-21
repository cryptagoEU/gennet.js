import type {JsonRpcNotification, Provider, ProviderEvent, ProviderEventListener, Subscription, SubscriptionTopic} from './types.js';
import {HttpProvider} from './providers/HttpProvider.js';
import {WebSocketProvider} from './providers/WebSocketProvider.js';
import {Admin} from './namespaces/Admin.js';
import {Net} from './namespaces/Net.js';
import {Personal} from './namespaces/Personal.js';
import {Agent} from './namespaces/Agent.js';
import {Mempool} from './namespaces/Mempool.js';

/**
 * GenNet Client — Hauptklasse für die Interaktion mit einem GenNet-Node.
 *
 * @example
 * ```typescript
 * const gennet = new GenNet('ws://localhost:18789');
 * await gennet.connect();
 *
 * const info = await gennet.admin.nodeInfo();
 * const peers = await gennet.net.peers();
 * await gennet.net.send('0x...', 'Hello');
 *
 * const sub = await gennet.subscribe('messages', (data) => console.log(data));
 * await sub.unsubscribe();
 *
 * gennet.disconnect();
 * ```
 */
export class GenNet {
    public readonly admin: Admin;
    public readonly net: Net;
    public readonly personal: Personal;
    public readonly agent: Agent;
    public readonly mempool: Mempool;

    private readonly provider: Provider;

    constructor(providerOrUrl: string | Provider) {
        if (typeof providerOrUrl === 'string') {
            this.provider = GenNet.createProvider(providerOrUrl);
        } else {
            this.provider = providerOrUrl;
        }

        this.admin = new Admin(this.provider);
        this.net = new Net(this.provider);
        this.personal = new Personal(this.provider);
        this.agent = new Agent(this.provider);
        this.mempool = new Mempool(this.provider);
    }

    /** Verbindung herstellen (nur bei WebSocket nötig). */
    async connect(): Promise<void> {
        if (this.provider.connect) {
            await this.provider.connect();
        }
    }

    /** Verbindung schließen. */
    disconnect(): void {
        this.provider.disconnect();
    }

    /** Ob eine aktive Verbindung besteht. */
    get connected(): boolean {
        return this.provider.connected;
    }

    /**
     * Subscription starten (nur WebSocket).
     * Topics: 'logs', 'messages', 'mempool'.
     */
    async subscribe(
        topic: SubscriptionTopic,
        callback: (data: unknown) => void,
    ): Promise<Subscription> {
        const subId = await this.provider.request('gennet_subscribe', [topic]) as string;

        const listener = (notification: JsonRpcNotification) => {
            if (
                notification.method === 'gennet_subscription' &&
                notification.params.subscription === subId
            ) {
                callback(notification.params.result);
            }
        };

        this.provider.on('notification', listener);

        return {
            id: subId,
            unsubscribe: async () => {
                this.provider.off('notification', listener);
                return await this.provider.request('gennet_unsubscribe', [subId]) as boolean;
            },
        };
    }

    /** Event-Listener registrieren (connect, disconnect, error). */
    on<E extends ProviderEvent>(event: E, listener: ProviderEventListener<E>): void {
        this.provider.on(event, listener);
    }

    /** Event-Listener entfernen. */
    off<E extends ProviderEvent>(event: E, listener: ProviderEventListener<E>): void {
        this.provider.off(event, listener);
    }

    /** Raw JSON-RPC Request (für erweiterte Nutzung). */
    async request(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown> {
        return this.provider.request(method, params);
    }

    // ── Private ────────────────────────────────────────────────

    private static createProvider(url: string): Provider {
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
            return new WebSocketProvider(url);
        }
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return new HttpProvider(url);
        }
        throw new Error(`Unbekanntes URL-Schema: ${url} (erwartet: ws://, wss://, http://, https://)`);
    }
}