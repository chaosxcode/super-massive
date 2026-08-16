<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { getContextApp } from '../context.svelte';
	import { preloadFont } from '../utils.svelte';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let wrap: HTMLDivElement;
	let initialised = $state(false);

	const initialiseApplication = async () => {
		PIXI.Assets.reset();
		const rendererSettings = context.stateApp.getRendererSettings?.() ?? {};

		// crisp minified art: trilinear mipmaps stop downscaled cutout symbols
		// from shimmering/aliasing at small board-cell sizes.
		PIXI.TextureSource.defaultOptions.autoGenerateMipmaps =
			rendererSettings.autoGenerateMipmaps ?? true;

		await preloadFont();
		context.stateApp.pixiApplication = new PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>();
		await context.stateApp.pixiApplication.init({
			autoDensity: true,
			backgroundAlpha: 0,
			hello: true,
			multiView: false,
			antialias: rendererSettings.antialias ?? true,
			clearBeforeRender: true,
			// WebGL, not WebGPU: on machines where Chrome exposes WebGPU (Windows/Mac
			// default) a flaky adapter kills the render loop after init — canvas stays
			// black while the DOM mascot/intro still show (Stake reviewer freeze).
			preference: 'webgl',
			powerPreference: 'high-performance',
			resolution: rendererSettings.resolution ?? devicePixelRatio.current,
			resizeTo: window,
		});
		if (rendererSettings.maxFps) {
			context.stateApp.pixiApplication.ticker.maxFPS = rendererSettings.maxFps;
		}

		wrap.appendChild(context.stateApp.pixiApplication.canvas);

		// to prevent that you can't scroll the page with touch on the canvas. https://github.com/pixijs/pixijs/issues/4824
		// 'manipulation' rather than 'auto': identical panning/pinch behaviour, minus
		// the double-tap-to-zoom gesture (Stake review). Kept in step with the
		// touch-action on <body> so the canvas doesn't opt the gesture back in.
		context.stateApp.pixiApplication.renderer.events.autoPreventDefault = false;
		context.stateApp.pixiApplication.renderer.canvas.style.touchAction = 'manipulation';
	};

	onMount(async () => {
		try {
			if (!initialised) await initialiseApplication();
			initialised = true;
		} catch (error) {
			console.error(error);
		}
	});

	onDestroy(() => {
		if (context.stateApp.pixiApplication) {
			context.stateApp.pixiApplication.destroy();
		}
	});
</script>

<div bind:this={wrap}>
	{#if initialised}
		{@render props.children()}
	{/if}
</div>
