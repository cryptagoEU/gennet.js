import type {Provider} from '../types.js';

/** mempool Namespace — Transaction Mempool. */
export class Mempool {
    constructor(private readonly provider: Provider) {}

    /** Nachricht ans Netzwerk broadcasten (GossipSub). */
    async broadcast(message: string): Promise<{ sent: boolean; taskId: string }> {
        return await this.provider.request('mempool_broadcast', {message}) as { sent: boolean; taskId: string };
    }
}