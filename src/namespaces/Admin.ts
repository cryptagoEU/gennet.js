import type {Provider, NodeInfo, ModuleInfo} from '../types.js';

/** admin Namespace — Node-Administration. */
export class Admin {
    constructor(private readonly provider: Provider) {}

    /** Node-Info: Status, PeerId, Adresse, Peers, Uptime, Module. */
    async nodeInfo(): Promise<NodeInfo> {
        return await this.provider.request('admin_nodeInfo') as NodeInfo;
    }

    /** Gateway herunterfahren. */
    async shutdown(): Promise<{ ok: boolean }> {
        return await this.provider.request('admin_shutdown') as { ok: boolean };
    }

    /** Alle Module und ihren Status auflisten. */
    async modules(): Promise<{ modules: ModuleInfo[] }> {
        return await this.provider.request('admin_modules') as { modules: ModuleInfo[] };
    }

    /** Ein Modul starten. */
    async startModule(name: string): Promise<{ name: string; state: string }> {
        return await this.provider.request('admin_startModule', {name}) as { name: string; state: string };
    }

    /** Ein Modul stoppen. */
    async stopModule(name: string): Promise<{ name: string; state: string }> {
        return await this.provider.request('admin_stopModule', {name}) as { name: string; state: string };
    }
}