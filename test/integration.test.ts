import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {GenNet} from '../src/GenNet.js';
import {WebSocketProvider} from '../src/providers/WebSocketProvider.js';
import {RpcError} from '../src/types.js';

/**
 * Integration Tests gegen einen laufenden GenNet-Node.
 *
 * Voraussetzung: GenNet-Node läuft mit:
 *   --modules net,agent,rpc,mem --http --ws.api net,mempool --http.api net,mempool
 *
 *   WS:   ws://127.0.0.1:18789
 *   HTTP:  http://127.0.0.1:18790
 *
 * Ausführen: npx vitest test/integration.test.ts
 */

const WS_URL = 'ws://127.0.0.1:18789';
const HTTP_URL = 'http://127.0.0.1:18790';

// ── WebSocket ──────────────────────────────────────────────────

describe('Integration: WebSocket', () => {
    let gennet: GenNet;

    beforeAll(async () => {
        gennet = new GenNet(WS_URL);
        await gennet.connect();
    }, 10_000);

    afterAll(() => {
        gennet.disconnect();
    });

    it('ist verbunden', () => {
        expect(gennet.connected).toBe(true);
    });

    describe('net', () => {
        it('peers liefert Peer-Liste', async () => {
            const result = await gennet.net.peers();
            expect(result.peers).toBeInstanceOf(Array);
            for (const peer of result.peers) {
                expect(peer.peerId).toBeDefined();
                expect(peer.address).toBeDefined();
                expect(typeof peer.connected).toBe('boolean');
            }
        });
    });

    describe('namespace-security', () => {
        it('admin ist über WS nicht verfügbar', async () => {
            await expect(
                gennet.admin.nodeInfo(),
            ).rejects.toThrow(RpcError);
        });

        it('personal ist über WS nicht verfügbar', async () => {
            await expect(
                gennet.personal.listIdentities(),
            ).rejects.toThrow(RpcError);
        });
    });

    describe('subscriptions', () => {
        it('subscribe/unsubscribe für logs', async () => {
            const received: unknown[] = [];
            const sub = await gennet.subscribe('logs', (data) => {
                received.push(data);
            });

            expect(sub.id).toBeDefined();
            expect(typeof sub.id).toBe('string');

            // Kurz warten — Log-Nachrichten kommen asynchron
            await new Promise(r => setTimeout(r, 2000));

            // Unsubscribe
            const ok = await sub.unsubscribe();
            expect(ok).toBe(true);

            // Falls Logs empfangen wurden, Format prüfen
            if (received.length > 0) {
                const log = received[0] as Record<string, unknown>;
                expect(log).toHaveProperty('line');
            }
        }, 10_000);
    });

    describe('raw request', () => {
        it('net_peers via request()', async () => {
            const result = await gennet.request('net_peers') as {peers: unknown[]};
            expect(result.peers).toBeInstanceOf(Array);
        });

        it('unbekannte Methode wirft RpcError', async () => {
            await expect(
                gennet.request('nonexistent_method'),
            ).rejects.toThrow(RpcError);
        });
    });

    describe('events', () => {
        it('connect-Event wird bei neuer Verbindung gefeuert', async () => {
            const provider = new WebSocketProvider(WS_URL, {
                reconnect: {enabled: false},
            });

            const connected = new Promise<void>(resolve => {
                provider.on('connect', () => resolve());
            });

            await provider.connect();
            await connected;

            expect(provider.connected).toBe(true);
            provider.disconnect();
        }, 10_000);
    });
});

// ── HTTP ───────────────────────────────────────────────────────

describe('Integration: HTTP', () => {
    let gennet: GenNet;

    beforeAll(() => {
        gennet = new GenNet(HTTP_URL);
    });

    describe('net', () => {
        it('peers liefert Peer-Liste', async () => {
            const result = await gennet.net.peers();
            expect(result.peers).toBeInstanceOf(Array);
        });
    });

    describe('namespace-security', () => {
        it('admin ist über HTTP nicht verfügbar', async () => {
            await expect(
                gennet.admin.nodeInfo(),
            ).rejects.toThrow(RpcError);
        });

        it('personal ist über HTTP nicht verfügbar', async () => {
            await expect(
                gennet.personal.listIdentities(),
            ).rejects.toThrow(RpcError);
        });
    });

    describe('raw request', () => {
        it('unbekannte Methode wirft RpcError', async () => {
            await expect(
                gennet.request('nonexistent_method'),
            ).rejects.toThrow(RpcError);
        });
    });

    describe('konsistenz', () => {
        it('gleiche peers über WS und HTTP', async () => {
            const wsGennet = new GenNet(WS_URL);
            await wsGennet.connect();

            const wsPeers = await wsGennet.net.peers();
            const httpPeers = await gennet.net.peers();

            expect(wsPeers.peers.length).toBe(httpPeers.peers.length);

            wsGennet.disconnect();
        }, 10_000);
    });
});