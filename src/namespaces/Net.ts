import type {Provider, PeerInfo, AgentResult} from '../types.js';

/** net Namespace — P2P-Netzwerk. */
export class Net {
    constructor(private readonly provider: Provider) {}

    /** Alle bekannten Peers auflisten. */
    async peers(): Promise<{ peers: PeerInfo[] }> {
        return await this.provider.request('net_peers') as { peers: PeerInfo[] };
    }

    /** Mit einem Peer über Multiaddr verbinden. */
    async connect(multiaddr: string): Promise<{ peerId: string; connected: boolean }> {
        return await this.provider.request('net_connect', {multiaddr}) as { peerId: string; connected: boolean };
    }

    /** Verschlüsselte Nachricht an einen Peer senden. */
    async send(address: string, text: string): Promise<{ sent: boolean; to: string }> {
        return await this.provider.request('net_send', {address, text}) as { sent: boolean; to: string };
    }

    /** Agent-Prompt auf einem Remote-Peer ausführen (ECIES-verschlüsselt). */
    async peerAgent(address: string, prompt: string): Promise<AgentResult> {
        return await this.provider.request('net_peerAgent', {address, prompt}) as AgentResult;
    }
}