import { createConfig, type CreateConnectorFn } from '@wagmi/core';
import { http, type HttpTransport } from 'viem';
import { type Chain } from '@wagmi/core/chains';

type SetWagmiConfigProps = {
	chains: Chain[];
	chainsWithCustomRpc: { chain: Chain; rpcUrl: string }[];
	connectors: CreateConnectorFn[];
};

let wagmiConfigValue: ReturnType<typeof createConfig> | null = null;
let connectorsValue: CreateConnectorFn[] = [];
const svelteWagmi = {
	get configuredConnectors(): CreateConnectorFn[] {
		return connectorsValue;
	},
	set configuredConnectors(connectors: CreateConnectorFn[]) {
		connectorsValue = connectors;
	},
	get config(): ReturnType<typeof createConfig> {
		if (!wagmiConfigValue) {
			throw new Error('wagmiConfig Value is not set');
		}
		return wagmiConfigValue;
	},
	set config({ chains, chainsWithCustomRpc, connectors }: SetWagmiConfigProps) {
		const transports: { [key: number]: HttpTransport } = chains
			? chains.reduce(
					(acc, chain) => ({
						...acc,
						[chain.id]: http()
					}),
					{}
				)
			: {};
		// Adding custom rpc URLs from `chainsWithCustomRpc`
		chainsWithCustomRpc.forEach(({ chain, rpcUrl }) => {
			transports[chain.id] = http(rpcUrl); // overwrite with the custom rpcUrl
		});

		// Combine both standard chains and chainsWithCustomRpc into one unified chains array
		const chainsToUse = [
			...chainsWithCustomRpc.map(({ chain }) => chain), // Add chains from chainsWithCustomRpc
			...chains.filter(({ id }) => !chainsWithCustomRpc.some((c) => c.chain.id === id)) // Add chains not in chainsWithCustomRpc
		];

		wagmiConfigValue = createConfig({
			chains: chainsToUse as [Chain, ...Chain[]],
			transports,
			connectors: connectors
		});
	}
};
export default svelteWagmi;
