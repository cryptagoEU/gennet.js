import type {JsonRpcResponse, JsonRpcErrorResponse, Provider, ProviderEvent, ProviderEventListener} from '../types.js';
import {RpcError} from '../types.js';

let requestId = 0;

/**
 * HTTP Provider — fetch-basiert, browser-kompatibel.
 * Unterstützt keine Subscriptions (kein Push-Kanal).
 */
export class HttpProvider implements Provider {
    private readonly url: string;
    private readonly token: string | undefined;

    constructor(url: string, token?: string) {
        this.url = url;
        this.token = token;
    }

    get connected(): boolean {
        return true; // HTTP ist stateless, immer "verbunden"
    }

    async request(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown> {
        const id = ++requestId;
        const body = JSON.stringify({jsonrpc: '2.0', id, method, params});

        const headers: Record<string, string> = {'Content-Type': 'application/json'};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(this.url, {
            method: 'POST',
            headers,
            body,
        });

        if (!res.ok) {
            throw new RpcError(`HTTP ${res.status}: ${res.statusText}`, -32000);
        }

        const json = await res.json() as JsonRpcResponse;

        if ('error' in json) {
            const err = (json as JsonRpcErrorResponse).error;
            throw new RpcError(err.message, err.code, err.data);
        }

        return json.result;
    }

    // HTTP unterstützt keine Events
    on<E extends ProviderEvent>(_event: E, _listener: ProviderEventListener<E>): void {}
    off<E extends ProviderEvent>(_event: E, _listener: ProviderEventListener<E>): void {}
    disconnect(): void {}
}