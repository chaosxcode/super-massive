<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { BACKGROUND_RATIO, PORTRAIT_BACKGROUND_RATIO, zIndexes } from '../game/constants';
	import { clock } from '../game/clock.svelte';
	import { performanceProfile } from '../game/performance.svelte';

	const context = getContext();

	// final art ships landscape (1664x928) + portrait (928x1664) repaints;
	// stacked layouts (portrait/tablet) take the portrait plate.
	const usePortrait = $derived(context.stateLayoutDerived.isStacked());

	const backgroundProps = $derived.by(() => {
		const ratio = usePortrait ? PORTRAIT_BACKGROUND_RATIO : BACKGROUND_RATIO;
		const layout = usePortrait
			? context.stateLayoutDerived.portraitBackgroundLayout({ scale: 1.02 })
			: context.stateLayoutDerived.normalBackgroundLayout({ scale: 1.02 });
		const width = layout.width ?? (layout.height ?? 0) * ratio;
		const height = layout.height ?? (layout.width ?? 0) / ratio;
		return { x: layout.x, y: layout.y, width, height, anchor: 0.5 };
	});
	const showBaseBackground = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');

	// ambience clock: lantern-glow pulse (base) + rain streak scroll (bonus).
	// Pure additive overlays — pure-black art is invisible where unlit.
	const phase = $derived(clock.now);

	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const lanternAlpha = $derived(0.22 + 0.08 * Math.sin(phase / 700));
	const lanternSize = $derived(Math.max(canvasSizes.width, canvasSizes.height) * 0.45);
	const rainOffset = $derived((phase / 1.8) % canvasSizes.height);

	// discrete embers raining down during free spins (the streak overlay alone
	// was barely readable) — fully derived from the rAF clock, no extra state.
	// Ember i falls top→bottom with a slow sway, fading in and out at the ends.
	const FIRE_FALL = Array.from({ length: performanceProfile.reducedEffects ? 5 : 12 }, (_, i) => i);
	const fireFallProps = (i: number, time: number) => {
		const cycle = (((time / (2800 + i * 380) + i * 0.29) % 1) + 1) % 1;
		const x =
			((((i * 0.083 + 0.04 + 0.045 * Math.sin(time / 900 + i * 2.1)) % 1) + 1) % 1) *
			canvasSizes.width;
		const y = cycle * (canvasSizes.height + 80) - 40;
		const size = (6 + (i % 4) * 3) * (i % 3 === 0 ? 1.4 : 1);
		return { x, y, width: size, height: size, alpha: 0.55 * (1 - Math.abs(2 * cycle - 1)) + 0.1 };
	};

	// subtle living caustics on the BASE background — a gentle underwater shimmer
	// (oversized square so the slow sway never reveals an edge; two parallax layers).
	const causticBase = $derived(Math.max(canvasSizes.width, canvasSizes.height) * 1.3);
	const causticSwayX = $derived(Math.sin(phase / 4200) * canvasSizes.width * 0.02);
	const causticSwayY = $derived(Math.cos(phase / 5300) * canvasSizes.height * 0.018);
	const causticScale = $derived(1 + 0.03 * Math.sin(phase / 3400));
	const causticAlpha = $derived(0.095 + 0.035 * Math.sin(phase / 1900));
	const causticAlpha2 = $derived(0.055 + 0.03 * Math.sin(phase / 2600 + 1.3));

	// Sparse stars use deterministic pseudo-random placement so SSR and the client
	// agree, while independent periods/phases keep the twinkle feeling irregular.
	const STAR_IDS = Array.from({ length: performanceProfile.reducedEffects ? 10 : 28 }, (_, i) => i);
	const hash = (value: number) => {
		const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
		return n - Math.floor(n);
	};
	const starProps = (i: number, time: number) => {
		const period = 2100 + hash(i * 7.17) * 4300;
		const starPhase = hash(i * 19.31) * Math.PI * 2;
		const wave = 0.5 + 0.5 * Math.sin((time / period) * Math.PI * 2 + starPhase);
		const flash =
			Math.max(0, Math.sin((time / (period * 0.73)) * Math.PI * 2 + starPhase * 1.7)) ** 18;
		const size = 30 + hash(i * 31.7) * 46;
		return {
			x: canvasSizes.width * (0.025 + hash(i * 3.71) * 0.95),
			y: canvasSizes.height * (0.025 + hash(i * 11.43) * 0.95),
			rotation: starPhase * 0.35,
			width: size,
			height: size,
			alpha: 0.06 + wave * 0.2 + flash * 0.58,
		};
	};
</script>

<Rectangle
	{...context.stateLayoutDerived.canvasSizes()}
	backgroundColor={0x000000}
	zIndex={zIndexes.background.backdrop}
/>

<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={zIndexes.background.normal}>
	<Sprite key={usePortrait ? 'bg_base_portrait' : 'bg_base'} {...backgroundProps} />
	{#if showBaseBackground}
		{#each STAR_IDS as i (i)}
			<Sprite
				key="particle_gold_fleck"
				blendMode="add"
				anchor={0.5}
				tint={i % 5 === 0 ? 0xb9e7ff : 0xffe7b3}
				{...starProps(i, phase)}
			/>
		{/each}
	{/if}
	<!-- warm lantern key light, lower-left (art_direction) -->
	<Sprite
		key="overlay_lantern"
		blendMode="add"
		anchor={0.5}
		x={canvasSizes.width * 0.12}
		y={canvasSizes.height * 0.82}
		width={lanternSize}
		height={lanternSize}
		alpha={lanternAlpha}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="overlay_lantern"
			blendMode="add"
			anchor={0.5}
			x={canvasSizes.width * 0.9}
			y={canvasSizes.height * 0.78}
			width={lanternSize * 0.7}
			height={lanternSize * 0.7}
			alpha={0.3 - lanternAlpha * 0.5}
		/>
	{/if}
	<!-- subtle animated underwater caustics (additive, two parallax layers) -->
	<Sprite
		key="overlay_caustic"
		blendMode="add"
		anchor={0.5}
		x={canvasSizes.width * 0.5 + causticSwayX}
		y={canvasSizes.height * 0.5 + causticSwayY}
		width={causticBase * causticScale}
		height={causticBase * causticScale}
		alpha={causticAlpha}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="overlay_caustic"
			blendMode="add"
			anchor={0.5}
			x={canvasSizes.width * 0.5 - causticSwayX * 0.6}
			y={canvasSizes.height * 0.5 - causticSwayY * 0.6}
			width={causticBase * 1.45 * (2 - causticScale)}
			height={causticBase * 1.45 * (2 - causticScale)}
			alpha={causticAlpha2}
		/>
	{/if}
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={zIndexes.background.feature}>
	<Sprite key={usePortrait ? 'bg_bonus_portrait' : 'bg_bonus'} {...backgroundProps} />
	{#if showFeatureBackground}
		{#each STAR_IDS as i (i)}
			<Sprite
				key="particle_gold_fleck"
				blendMode="add"
				anchor={0.5}
				tint={i % 4 === 0 ? 0xffbc72 : 0xffe1b0}
				{...starProps(i, phase)}
			/>
		{/each}
	{/if}
	<!-- faint living ember-web shimmer (same treatment as the base bg, a touch warmer) -->
	<Sprite
		key="overlay_caustic"
		blendMode="add"
		anchor={0.5}
		x={canvasSizes.width * 0.5 + causticSwayX}
		y={canvasSizes.height * 0.5 + causticSwayY}
		width={causticBase * causticScale}
		height={causticBase * causticScale}
		alpha={causticAlpha * 0.9}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="overlay_caustic"
			blendMode="add"
			anchor={0.5}
			x={canvasSizes.width * 0.5 - causticSwayX * 0.6}
			y={canvasSizes.height * 0.5 - causticSwayY * 0.6}
			width={causticBase * 1.45 * (2 - causticScale)}
			height={causticBase * 1.45 * (2 - causticScale)}
			alpha={causticAlpha2}
		/>
	{/if}
	<!-- firefall: ember-streak layers scrolling down, heavier than the old rain -->
	<Sprite
		key="overlay_rain"
		blendMode="add"
		x={0}
		y={rainOffset - canvasSizes.height}
		width={canvasSizes.width}
		height={canvasSizes.height * 2}
		alpha={0.3}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="overlay_rain"
			blendMode="add"
			x={-canvasSizes.width * 0.2}
			y={((rainOffset * 1.6) % canvasSizes.height) - canvasSizes.height}
			width={canvasSizes.width * 1.4}
			height={canvasSizes.height * 2}
			alpha={0.17}
		/>
	{/if}
	<!-- discrete falling embers — the readable part of the firefall -->
	{#each FIRE_FALL as i (i)}
		<Sprite
			key={i % 3 === 0 ? 'particle_gold_fleck' : 'particle_bubble'}
			blendMode="add"
			anchor={0.5}
			{...fireFallProps(i, phase)}
		/>
	{/each}
</FadeContainer>
