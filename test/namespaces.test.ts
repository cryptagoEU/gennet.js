import {describe, it, expect, beforeEach} from 'vitest';
import {Admin} from '../src/namespaces/Admin.js';
import {Net} from '../src/namespaces/Net.js';
import {Personal} from '../src/namespaces/Personal.js';
import {Agent} from '../src/namespaces/Agent.js';
import {Mempool} from '../src/namespaces/Mempool.js';
import {MockProvider} from './MockProvider.js';

describe('Namespaces', () => {
    let provider: MockProvider;

    beforeEach(() => {
        provider = new MockProvider();
    });

    // ── Admin ──────────────────────────────────────────────────

    describe('Admin', () => {
        it('nodeInfo ruft admin_nodeInfo auf', async () => {
            const response = {state: 'RUNNING', address: '0x123', peers: 3};
            provider.setResponse('admin_nodeInfo', response);

            const admin = new Admin(provider);
            const result = await admin.nodeInfo();

            expect(result).toEqual(response);
            expect(provider.calls[0]).toEqual({method: 'admin_nodeInfo', params: undefined});
        });

        it('shutdown ruft admin_shutdown auf', async () => {
            provider.setResponse('admin_shutdown', {ok: true});

            const admin = new Admin(provider);
            const result = await admin.shutdown();

            expect(result).toEqual({ok: true});
            expect(provider.calls[0]?.method).toBe('admin_shutdown');
        });

        it('modules ruft admin_modules auf', async () => {
            const response = {modules: [{name: 'net', version: '1.0', state: 'running'}]};
            provider.setResponse('admin_modules', response);

            const admin = new Admin(provider);
            const result = await admin.modules();

            expect(result.modules).toHaveLength(1);
            expect(provider.calls[0]?.method).toBe('admin_modules');
        });

        it('startModule sendet Modulname', async () => {
            provider.setResponse('admin_startModule', {name: 'net', state: 'running'});

            const admin = new Admin(provider);
            const result = await admin.startModule('net');

            expect(result).toEqual({name: 'net', state: 'running'});
            expect(provider.calls[0]).toEqual({method: 'admin_startModule', params: {name: 'net'}});
        });

        it('stopModule sendet Modulname', async () => {
            provider.setResponse('admin_stopModule', {name: 'net', state: 'stopped'});

            const admin = new Admin(provider);
            const result = await admin.stopModule('net');

            expect(result).toEqual({name: 'net', state: 'stopped'});
            expect(provider.calls[0]).toEqual({method: 'admin_stopModule', params: {name: 'net'}});
        });
    });

    // ── Net ────────────────────────────────────────────────────

    describe('Net', () => {
        it('peers ruft net_peers auf', async () => {
            const response = {peers: [{peerId: 'abc', address: '0x1', multiaddr: '/ip4/...', connected: true}]};
            provider.setResponse('net_peers', response);

            const net = new Net(provider);
            const result = await net.peers();

            expect(result.peers).toHaveLength(1);
            expect(provider.calls[0]?.method).toBe('net_peers');
        });

        it('connect sendet Multiaddr', async () => {
            provider.setResponse('net_connect', {peerId: 'abc', connected: true});

            const net = new Net(provider);
            const result = await net.connect('/ip4/127.0.0.1/tcp/9000/p2p/abc');

            expect(result.connected).toBe(true);
            expect(provider.calls[0]).toEqual({
                method: 'net_connect',
                params: {multiaddr: '/ip4/127.0.0.1/tcp/9000/p2p/abc'},
            });
        });

        it('send sendet Adresse und Text', async () => {
            provider.setResponse('net_send', {sent: true, to: '0xABC'});

            const net = new Net(provider);
            const result = await net.send('0xABC', 'Hello');

            expect(result).toEqual({sent: true, to: '0xABC'});
            expect(provider.calls[0]).toEqual({
                method: 'net_send',
                params: {address: '0xABC', text: 'Hello'},
            });
        });

        it('peerAgent sendet Adresse und Prompt', async () => {
            provider.setResponse('net_peerAgent', {ok: true, response: '4'});

            const net = new Net(provider);
            const result = await net.peerAgent('0xABC', 'Was ist 2+2?');

            expect(result).toEqual({ok: true, response: '4'});
            expect(provider.calls[0]).toEqual({
                method: 'net_peerAgent',
                params: {address: '0xABC', prompt: 'Was ist 2+2?'},
            });
        });
    });

    // ── Personal ───────────────────────────────────────────────

    describe('Personal', () => {
        it('newIdentity sendet Passwort', async () => {
            provider.setResponse('personal_newIdentity', {address: '0xNEW', path: '/keystore/...'});

            const personal = new Personal(provider);
            const result = await personal.newIdentity('geheim');

            expect(result.address).toBe('0xNEW');
            expect(provider.calls[0]).toEqual({
                method: 'personal_newIdentity',
                params: {password: 'geheim'},
            });
        });

        it('listIdentities ruft personal_listIdentities auf', async () => {
            provider.setResponse('personal_listIdentities', {
                identities: [{index: 0, address: '0x1', filename: 'UTC--...'}],
            });

            const personal = new Personal(provider);
            const result = await personal.listIdentities();

            expect(result.identities).toHaveLength(1);
            expect(provider.calls[0]?.method).toBe('personal_listIdentities');
        });
    });

    // ── Agent ──────────────────────────────────────────────────

    describe('Agent', () => {
        it('run sendet Prompt', async () => {
            provider.setResponse('agent_run', {ok: true, response: '4', toolCalls: [], tokensUsed: {input: 10, output: 5}});

            const agent = new Agent(provider);
            const result = await agent.run('Was ist 2+2?');

            expect(result.response).toBe('4');
            expect(provider.calls[0]).toEqual({
                method: 'agent_run',
                params: {input: 'Was ist 2+2?'},
            });
        });
    });

    // ── Mempool ────────────────────────────────────────────────

    describe('Mempool', () => {
        it('broadcast sendet Nachricht', async () => {
            provider.setResponse('mempool_broadcast', {sent: true, taskId: 'task-123'});

            const mempool = new Mempool(provider);
            const result = await mempool.broadcast('Hello network!');

            expect(result).toEqual({sent: true, taskId: 'task-123'});
            expect(provider.calls[0]).toEqual({
                method: 'mempool_broadcast',
                params: {message: 'Hello network!'},
            });
        });
    });
});