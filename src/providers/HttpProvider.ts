import type {JsonRpcNotification, JsonRpcResponse, JsonRpcErrorResponse, Provider} from '../types.js';
import {RpcError} from '../types.js';

let requestId = 0;

/**
 * HTTP Provider — fetch-basiert, browser-kompatibel.
 * Unterstützt keine Subscriptions (kein Push-Kanal).
 */
export class HttpProvider implements Provider {
    private readonly url: string;

    constructor(url: string) {
        this.url = url;
    }

    get connected(): boolean {
        return true; // HTTP ist stateless, immer "verbunden"
    }

    async request(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown> {
        const id = ++requestId;
        const body = JSON.stringify({jsonrpc: '2.0', id, method, params});

        const res = await fetch(this.url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
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

    // HTTP unterstützt keine Push-Notifications
    on(_event: 'notification', _listener: (notification: JsonRpcNotification) => void): void {}
    off(_event: 'notification', _listener: (notification: JsonRpcNotification) => void): void {}
    disconnect(): void {}
}