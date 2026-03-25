# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gennet.js is a TypeScript JSON-RPC client library for GenNet nodes. Zero runtime dependencies, dual ESM/CJS distribution, Browser + Node.js (>=22) compatible.

## Commands

- **Build:** `npm run build` (uses unbuild, outputs to `dist/`)
- **Dev build:** `npm run dev` (unbuild stub mode)
- **Test (unit only):** `npm test` (vitest, excludes integration tests)
- **Run single test:** `npx vitest test/GenNet.test.ts`
- **Integration tests:** `npx vitest test/integration.test.ts` (requires a running GenNet node)
- **Lint:** `npm run lint` (eslint on `src/`)
- **Package checks:** `npm run check` (publint + attw for dual-package correctness)
- **Release:** managed via Changesets (`npm run changeset`)

## Architecture

**Provider pattern with auto-detection.** The `GenNet` class accepts a URL or a `Provider` instance. URLs starting with `ws://`/`wss://` create a `WebSocketProvider`; `http://`/`https://` create an `HttpProvider`.

### Core layers

1. **Providers** (`src/providers/`) — implement the `Provider` interface from `src/types.ts`. Handle JSON-RPC 2.0 transport, request/response correlation, and connection lifecycle.
   - `WebSocketProvider` — stateful, supports subscriptions, auto-reconnect with exponential backoff, emits connection events.
   - `HttpProvider` — stateless fetch-based, no subscriptions, stubs event methods.

2. **Namespaces** (`src/namespaces/`) — thin typed wrappers that call `provider.request()` with the correct RPC method name. Each namespace takes a `Provider` in its constructor:
   - `Admin` — `admin_*` methods (nodeInfo, shutdown, modules, start/stopModule)
   - `Net` — `net_*` methods (peers, connect, send, peerAgent)
   - `Personal` — `personal_*` methods (newIdentity, listIdentities)
   - `Agent` — `agent_*` methods (run)
   - `Mempool` — `mempool_*` methods (broadcast)

3. **GenNet** (`src/GenNet.ts`) — main facade. Creates provider, instantiates all namespaces, exposes `subscribe()` for WebSocket push notifications (topics: logs, messages, mempool).

### Types

All types live in `src/types.ts`: JSON-RPC protocol types, domain response types (`NodeInfo`, `PeerInfo`, etc.), the `Provider` interface, and `RpcError`.

### Testing

Tests use vitest with a `MockProvider` (`test/MockProvider.ts`) that implements the `Provider` interface for unit testing without network. Integration tests in `test/integration.test.ts` hit a real node and are excluded from the default test run via `vitest.config.ts`.

## Conventions

- Code comments and JSDoc are in German.
- All RPC method names follow the pattern `namespace_methodName` (e.g., `admin_nodeInfo`, `net_peers`).
- The package uses `.js` extensions in TypeScript imports (`'./types.js'`) for ESM compatibility.
- CI runs on Node 22 and 24. Target is ES2022 with strict TypeScript.