import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { celo } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'BabyClaw Dapp',
    projectId: 'YOUR_PROJECT_ID',
    chains: [
        celo
    ],
});
