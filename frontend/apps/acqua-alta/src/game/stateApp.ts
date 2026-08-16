import { createApp } from 'pixi-svelte';

import assets from './assets';
import { performanceProfile } from './performance.svelte';

export const { stateApp } = createApp({
	assets,
	getRendererSettings: () => ({
		resolution: performanceProfile.resolution,
		antialias: performanceProfile.antialias,
		maxFps: performanceProfile.targetFps,
	}),
});
