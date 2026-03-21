import {describe, it, expect} from 'vitest';
import {GenNet} from '../src/GenNet.js';
import {WebSocketProvider} from '../src/providers/WebSocketProvider.js';
import {HttpProvider} from '../src/providers/HttpProvider.js';
import {MockProvider} from './MockProvider.js';

describe('GenNet', () => {
    describe('Provider-Erkennung', () => {
        it('erstellt WebSocketProvider für ws://', () => {
            const gennet = new GenNet('ws://localhost:18789');
            expect(gennet).toBeDefined();
        });

        it('erstellt WebSocketProvider für wss://', () => {
            const gennet = new GenNet('wss://example.com');
            expect(gennet).toBeDefined();
        });

        it('erstellt HttpProvider für http://', () => {
            const gennet = new GenNet('http://localhost:18790');
            expect(gennet).toBeDefined();
        });

        it('erstellt HttpProvider für https://', () => {
            const gennet = new GenNet('https://example.com');
            expect(gennet).toBeDefined();
        });

        it('wirft Fehler bei unbekanntem Schema', () => {
            expect(() => new GenNet('ftp://localhost')).toThrow('Unbekanntes URL-Schema');
        });

        it('akzeptiert einen custom Provider', () => {
            const provider = new MockProvider();
            const gennet = new GenNet(provider);
            expect(gennet.connected).toBe(true);
        });
    });

    describe('Namespaces', () => {
        it('hat alle Namespaces', () => {
            const gennet = new GenNet(new MockProvider());
            expect(gennet.admin).toBeDefined();
            expect(gennet.net).toBeDefined();
            expect(gennet.personal).toBeDefined();
            expect(gennet.agent).toBeDefined();
            expect(gennet.mempool).toBeDefined();
        });
    });

    describe('Subscriptions', () => {
        it('subscribe sendet gennet_subscribe und empfängt Notifications', async () => {
            const provider = new MockProvider();
            provider.setResponse('gennet_subscribe', 'sub-123');
            provider.setResponse('gennet_unsubscribe', true);

            const gennet = new GenNet(provider);
            const received: unknown[] = [];

            const sub = await gennet.subscribe('messages', (data) => {
                received.push(data);
            });

            expect(sub.id).toBe('sub-123');
            expect(provider.calls[0]).toEqual({method: 'gennet_subscribe', params: ['messages']});

            // Notification simulieren
            provider.emit({
                jsonrpc: '2.0',
                method: 'gennet_subscription',
                params: {subscription: 'sub-123', result: {text: 'Hello'}},
            });

            expect(received).toEqual([{text: 'Hello'}]);

            // Fremde Subscription ignorieren
            provider.emit({
                jsonrpc: '2.0',
                method: 'gennet_subscription',
                params: {subscription: 'other-id', result: {text: 'Ignored'}},
            });

            expect(received).toHaveLength(1);

            // Unsubscribe
            const ok = await sub.unsubscribe();
            expect(ok).toBe(true);
        });
    });

    describe('Raw Request', () => {
        it('leitet request direkt an Provider weiter', async () => {
            const provider = new MockProvider();
            provider.setResponse('custom_method', {ok: true});

            const gennet = new GenNet(provider);
            const result = await gennet.request('custom_method', {key: 'value'});

            expect(result).toEqual({ok: true});
            expect(provider.calls[0]).toEqual({method: 'custom_method', params: {key: 'value'}});
        });
    });
});