// Reexport your entry components here
import {
	connected,
	chainId,
	signerAddress,
	loading,
	reownAppkit,
	wagmiLoaded,
	init,
	WC,
	disconnectWagmi,
	defaultConfig
} from './wagmi/stores.js';

import svelteWagmi from './wagmi/config.js';
export {
	defaultConfig,
	wagmiLoaded,
	connected,
	chainId,
	init,
	svelteWagmi,
	reownAppkit,
	signerAddress,
	loading,
	WC,
	disconnectWagmi
};
