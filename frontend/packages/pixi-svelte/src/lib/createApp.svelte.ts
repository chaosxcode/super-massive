import * as PIXI from 'pixi.js';

import type { LoadedAssets, Assets } from './types';

export type RendererSettings = {
	resolution?: number;
	antialias?: boolean;
	maxFps?: number;
	autoGenerateMipmaps?: boolean;
};

export function createApp({
	assets,
	getRendererSettings,
}: {
	assets: Assets;
	getRendererSettings?: () => RendererSettings;
}) {
	const reset = () => {
		stateApp.loaded = false;
		stateApp.loadingProgress = 0;
		stateApp.loadedAssets = {};
		stateApp.pixiApplication = undefined as PIXI.Application | undefined;
	};

	const stateApp = $state({
		reset,
		assets,
		getRendererSettings,
		loaded: false,
		loadingProgress: 0,
		loadedAssets: {} as LoadedAssets,
		pixiApplication: undefined as PIXI.Application | undefined,
	});

	return {
		stateApp,
	};
}

export type App = ReturnType<typeof createApp>;
