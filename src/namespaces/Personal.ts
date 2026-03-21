import type {Provider, IdentityInfo} from '../types.js';

/** personal Namespace — Identity/Keystore-Management. */
export class Personal {
    constructor(private readonly provider: Provider) {}

    /** Neue Identität erstellen und im Keystore speichern. */
    async newIdentity(password: string): Promise<{ address: string; path: string }> {
        return await this.provider.request('personal_newIdentity', {password}) as { address: string; path: string };
    }

    /** Alle Identitäten im Keystore auflisten. */
    async listIdentities(): Promise<{ identities: IdentityInfo[] }> {
        return await this.provider.request('personal_listIdentities') as { identities: IdentityInfo[] };
    }
}