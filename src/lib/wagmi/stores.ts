import { writable, get } from 'svelte/store';
import {
	getAccount,
	disconnect,
	watchAccount,
	reconnect,
	type CreateConnectorFn,
	type GetAccountReturnType
} from '@wagmi/core';
import { arbitrum, mainnet, optimism, polygon, type Chain } from '@wagmi/core/chains';
// import { createReowreownAppkit, type ReowreownAppkit } from '@reownAppkit/wagmi';
import { type AppKit, createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import svelteWagmi from './config.js';

export const connected = writable<boolean>(false);
export const wagmiLoaded = writable<boolean>(false);
export const chainId = writable<number | null | undefined>(null);
export const signerAddress = writable<string | null>(null);
export const loading = writable<boolean>(true);
export const reownAppkit = writable<AppKit>();

type DefaultConfigProps = {
	appName: string;
	appIcon?: string | null;
	appDescription?: string | null;
	appUrl?: string | null;
	autoConnect?: boolean;
	chains?: Chain[];
	chainsWithCustomRpc?: { chain: Chain; rpcUrl: string }[];
	connectors: CreateConnectorFn[];
	walletConnectProjectId: string;
};

const defaultChains = [mainnet, polygon, optimism, arbitrum];
export const defaultConfig = ({
	autoConnect = true,
	chains = defaultChains,
	chainsWithCustomRpc = [],
	connectors,
	walletConnectProjectId
}: DefaultConfigProps) => {
	svelteWagmi.configuredConnectors = connectors;

	//add email connector
	// configuredConnectors.update((connectors) => [...connectors]);

	svelteWagmi.config = {
		chains,
		chainsWithCustomRpc,
		connectors: svelteWagmi.configuredConnectors
	};

	if (autoConnect) reconnect(svelteWagmi.config);

	const allChains = [...chains, ...chainsWithCustomRpc.map(({ chain }) => chain)];
	const wagmiAdapter = new WagmiAdapter({
		networks: allChains,
		projectId: walletConnectProjectId
	});
	const modal = createAppKit({
		adapters: [wagmiAdapter],
		networks: [mainnet, arbitrum],
		// metadata: metadata,
		projectId: walletConnectProjectId,
		features: {
			analytics: true
		}
	});
	reownAppkit.set(modal);
	wagmiLoaded.set(true);

	return { init };
};

export const init = async () => {
	try {
		setupListeners();
		const account = await waitForConnection();
		if (account.address) {
			const chain = svelteWagmi.config.chains.find((chain) => chain.id === account.chainId);
			if (chain) chainId.set(chain.id);
			connected.set(true);
			signerAddress.set(account.address);
		}
		loading.set(false);
	} catch (err) {
		loading.set(false);
	}
};

const setupListeners = () => {
	watchAccount(svelteWagmi.config, {
		onChange(data) {
			handleAccountChange(data);
		}
	});
};

const handleAccountChange = (data: GetAccountReturnType) => {
	// Wrap the original async logic in an immediately invoked function expression (IIFE)
	return (async () => {
		if (get(wagmiLoaded) && data.address) {
			const chain = svelteWagmi.config.chains.find((chain) => chain.id === data.chainId);

			if (chain) chainId.set(chain.id);
			connected.set(true);
			loading.set(false);
			signerAddress.set(data.address);
		} else if (data.isDisconnected && get(connected)) {
			loading.set(false);
			await disconnectWagmi(); // Handle async operation inside
		}
	})();
};

export const WC = async () => {
	try {
		get(reownAppkit).open();
		await waitForAccount();

		return { succcess: true };
	} catch (err) {
		return { success: false };
	}
};

export const disconnectWagmi = async () => {
	await disconnect(svelteWagmi.config);
	connected.set(false);
	chainId.set(null);
	signerAddress.set(null);
	loading.set(false);
};

const waitForAccount = () => {
	return new Promise((resolve, reject) => {
		const unsub1 = get(reownAppkit).subscribeEvents((newState) => {
			if (newState.data.event === 'MODAL_CLOSE') {
				reject('modal closed');
				unsub1();
			}
		});
		const unsub = watchAccount(svelteWagmi.config, {
			onChange(data) {
				if (data?.isConnected) {
					// Gottem, resolve the promise w/user's selected & connected Acc.
					resolve(data);
					unsub();
				} else {
					console.warn('🔃 - No Account Connected Yet...');
				}
			}
		});
	});
};

const waitForConnection = (): Promise<GetAccountReturnType> =>
	new Promise((resolve, reject) => {
		const attemptToGetAccount = () => {
			const account = getAccount(svelteWagmi.config);
			if (account.isDisconnected) reject('account is disconnected');
			if (account.isConnecting) {
				setTimeout(attemptToGetAccount, 250);
			} else {
				resolve(account);
			}
		};

		attemptToGetAccount();
	});
