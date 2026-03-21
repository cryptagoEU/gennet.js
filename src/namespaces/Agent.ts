import type {Provider, AgentResult} from '../types.js';

/** agent Namespace — Lokaler AI-Agent. */
export class Agent {
    constructor(private readonly provider: Provider) {}

    /** Agent-Loop mit einem Prompt ausführen. */
    async run(input: string): Promise<AgentResult> {
        return await this.provider.request('agent_run', {input}) as AgentResult;
    }
}