// ── JSON-RPC 2.0 ────────────────────────────────────────────────

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, unknown> | unknown[];
}

export interface JsonRpcSuccessResponse {
    jsonrpc: '2.0';
    id: string | number;
    result: unknown;
}

export interface JsonRpcErrorResponse {
    jsonrpc: '2.0';
    id: string | number;
    error: { code: number; message: string; data?: unknown };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface JsonRpcNotification {
    jsonrpc: '2.0';
    method: string;
    params: { subscription: string; result: unknown };
}

// ── RPC Error ───────────────────────────────────────────────────

export class RpcError extends Error {
    public readonly code: number;
    public readonly data?: unknown;

    constructor(message: string, code: number, data?: unknown) {
        super(message);
        this.name = 'RpcError';
        this.code = code;
        this.data = data;
    }
}

// ── Gateway Response Types ──────────────────────────────────────

export type GatewayState = 'INITIALIZING' | 'READY' | 'RUNNING' | 'STOPPED';

export interface ModuleInfo {
    name: string;
    version: string;
    state: string;
    status?: string;
}

export interface NodeInfo {
    state: GatewayState;
    peerId: string | null;
    address: string;
    peers: number;
    knownPeers: number;
    uptime: number;
    multiaddrs: string[];
    tcpAddrs: string[];
    circuitAddrs: string[];
    relay: boolean;
    listenPort: number;
    datadir: string;
    modules: ModuleInfo[];
}

export interface PeerInfo {
    peerId: string;
    address: string;
    multiaddr: string;
    connected: boolean;
}

export interface AgentResult {
    ok: boolean;
    response?: string;
    toolCalls?: Array<{ name: string }>;
    tokensUsed?: { input: number; output: number };
    error?: string;
}

export interface IdentityInfo {
    index: number;
    address: string;
    filename: string;
}

// ── Subscription ────────────────────────────────────────────────

export type SubscriptionTopic = 'logs' | 'messages' | 'mempool';

export interface Subscription {
    id: string;
    unsubscribe: () => Promise<boolean>;
}

// ── Provider ────────────────────────────────────────────────────

export interface Provider {
    /** JSON-RPC Request senden und auf Response warten. */
    request(method: string, params?: Record<string, unknown> | unknown[]): Promise<unknown>;
    /** Listener für Push-Notifications (Subscriptions). */
    on(event: 'notification', listener: (notification: JsonRpcNotification) => void): void;
    /** Listener entfernen. */
    off(event: 'notification', listener: (notification: JsonRpcNotification) => void): void;
    /** Verbindung schließen. */
    disconnect(): void;
    /** Verbindung herstellen (bei WebSocket). */
    connect?(): Promise<void>;
    /** Ob eine aktive Verbindung besteht. */
    readonly connected: boolean;
}