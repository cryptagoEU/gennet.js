# gennet.js

[![npm version](https://img.shields.io/npm/v/gennet.js)](https://www.npmjs.com/package/gennet.js)
[![npm downloads](https://img.shields.io/npm/dm/gennet.js)](https://www.npmjs.com/package/gennet.js)
[![CI](https://img.shields.io/github/actions/workflow/status/cryptagoEU/gennet.js/ci.yml?label=CI)](https://github.com/cryptagoEU/gennet.js/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/gennet.js)](https://github.com/cryptagoEU/gennet.js/blob/main/LICENSE)

[![ES Version](https://img.shields.io/badge/ES-2022-yellow)](https://github.com/cryptagoEU/gennet.js)
[![Node Version](https://img.shields.io/badge/node-≥22-green)](https://github.com/cryptagoEU/gennet.js)

Client library for [GenNet](https://github.com/cryptagoEU/gennet.js) — interact with GenNet nodes via JSON-RPC.

- Zero runtime dependencies
- Browser + Node.js compatible
- WebSocket & HTTP providers
- Full TypeScript support (ESM + CJS)
- Subscriptions (logs, messages, mempool)
- Auto-reconnect with exponential backoff
- Connection events (connect, disconnect, error)

## Installation

```bash
npm install gennet.js
```

## Quick Start

```typescript
import { GenNet } from 'gennet.js';

const gennet = new GenNet('ws://localhost:18789');
await gennet.connect();

// Node info
const info = await gennet.admin.nodeInfo();
console.log(info.address, info.peers);

// Send encrypted message
await gennet.net.send('0xRecipientAddress', 'Hello!');

// Disconnect
gennet.disconnect();
```

## Providers

gennet.js auto-detects the provider from the URL:

```typescript
// WebSocket (supports subscriptions)
const gennet = new GenNet('ws://localhost:18789');

// HTTP (stateless, no subscriptions)
const gennet = new GenNet('http://localhost:18790');
```

You can also pass a custom provider with options:

```typescript
import { GenNet, WebSocketProvider } from 'gennet.js';

const provider = new WebSocketProvider('ws://localhost:18789', {
  timeout: 10_000,
  reconnect: {
    enabled: true,      // default: true
    maxRetries: 10,     // default: 5
    delay: 2000,        // default: 1000ms (doubles each attempt)
    maxDelay: 60_000,   // default: 30000ms
  },
});
const gennet = new GenNet(provider);
```

## API

### admin

```typescript
await gennet.admin.nodeInfo();                // Node status, peers, uptime, modules
await gennet.admin.shutdown();                // Shutdown the gateway
await gennet.admin.modules();                 // List all modules and their state
await gennet.admin.startModule('net');        // Start a module
await gennet.admin.stopModule('net');         // Stop a module
```

### net

```typescript
await gennet.net.peers();                                   // List known peers
await gennet.net.connect('/ip4/127.0.0.1/tcp/9000/p2p/…');  // Connect to peer
await gennet.net.send('0x…', 'Hello');                       // Send encrypted message
await gennet.net.peerAgent('0x…', 'What is 2+2?');           // Remote agent execution
```

### personal

```typescript
await gennet.personal.newIdentity('password');   // Create new identity
await gennet.personal.listIdentities();          // List keystore identities
```

### agent

```typescript
await gennet.agent.run('What is 2+2?');   // Run local agent prompt
```

### mempool

```typescript
await gennet.mempool.broadcast('Hello network!');   // Broadcast via GossipSub
```

### Subscriptions

Subscriptions are available over WebSocket. Topics: `logs`, `messages`, `mempool`.

```typescript
const sub = await gennet.subscribe('messages', (data) => {
  console.log('New message:', data);
});

// Unsubscribe
await sub.unsubscribe();
```

### Raw RPC

For methods not covered by the namespaces:

```typescript
const result = await gennet.request('custom_method', { key: 'value' });
```

## Events

The WebSocket provider emits connection lifecycle events:

```typescript
gennet.on('connect', () => {
  console.log('Connected to GenNet node');
});

gennet.on('disconnect', () => {
  console.log('Disconnected — reconnecting...');
});

gennet.on('error', (err) => {
  console.error('Connection error:', err.message);
});
```

Auto-reconnect is enabled by default. After a disconnect, the provider reconnects with exponential backoff. Call `gennet.disconnect()` to stop reconnecting.

## Error Handling

RPC errors throw a typed `RpcError`:

```typescript
import { RpcError } from 'gennet.js';

try {
  await gennet.net.send('0xInvalid', 'Hello');
} catch (err) {
  if (err instanceof RpcError) {
    console.error(err.message, err.code);
  }
}
```

## License

MIT
