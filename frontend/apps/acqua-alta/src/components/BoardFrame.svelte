<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	// SUPERMASSIVE frame — the chunky art CUT UP AND ALIVE (owner call):
	// four slimmed rail bands + the four corner gears tick-rotating like the
	// symbol rigs + the crown vortex spinning at the top center. All geometry
	// derives from FRAME_GEO so the mascot/logo/ember math stays in sync.
	import { sineInOut, cubicOut } from 'svelte/easing';
	import { Container, Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { FRAME_GEO, FRAME_VORTEX_OFFSET } from '../game/constants';
	import { clock } from '../game/clock.svelte';
	import { performanceProfile } from '../game/performance.svelte';
	import {
		LIGHT_TINT_COLD,
		LIGHT_TINT_HOT,
		LIGHT_TINT_WARM,
		lightFlicker,
		lightSweepAlpha,
		lightSweepProgress,
	} from '../game/light.svelte';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';

	const context = getContext();

	const G = FRAME_GEO;
	type Rail = {
		key: 'frame_top' | 'frame_bottom' | 'frame_left' | 'frame_right';
		x: number;
		y: number;
		anchor: { x: number; y: number };
		width: number;
		height: number;
		axis: 'x' | 'y';
		dir: 1 | -1;
		seed: number;
	};
	const RAILS: Rail[] = [
		{
			key: 'frame_top',
			x: 0,
			y: -G.openY,
			anchor: { x: 0.5, y: 1 },
			width: G.topW,
			height: G.topH,
			axis: 'x',
			dir: 1,
			seed: 120,
		},
		{
			key: 'frame_right',
			x: G.openX,
			y: 0,
			anchor: { x: 0, y: 0.5 },
			width: G.sideW,
			height: G.sideH,
			axis: 'y',
			dir: 1,
			seed: 980,
		},
		{
			key: 'frame_bottom',
			x: 0,
			y: G.openY,
			anchor: { x: 0.5, y: 0 },
			width: G.topW,
			height: G.botH,
			axis: 'x',
			dir: -1,
			seed: 1840,
		},
		{
			key: 'frame_left',
			x: -G.openX,
			y: 0,
			anchor: { x: 1, y: 0.5 },
			width: G.sideW,
			height: G.sideH,
			axis: 'y',
			dir: -1,
			seed: 2700,
		},
	];

	const railProgress = (rail: Rail) => lightSweepProgress(4100 + (rail.seed % 650), 980, rail.seed);
	const railLocalProgress = (rail: Rail, progress: number) =>
		rail.dir === 1 ? progress : 1 - progress;
	const railLightX = (rail: Rail, progress: number) =>
		rail.axis === 'x' ? (progress - 0.5) * rail.width * 1.18 : 0;
	const railLightY = (rail: Rail, progress: number) =>
		rail.axis === 'y' ? (progress - 0.5) * rail.height * 1.18 : 0;
	const railHotAlpha = (rail: Rail, progress: number) =>
		lightSweepAlpha(progress, rail.seed) * 0.82;
	const railColdAlpha = (rail: Rail, progress: number) =>
		lightSweepAlpha(progress, rail.seed + 37) * 0.38;
	const railIdleAlpha = (rail: Rail) => 0.04 + lightFlicker(rail.seed + 79) * 0.1;

	// clockwork tick (same feel as the symbol gears)
	const easeOutBack = (u: number) => {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
	};
	const gearRot = (periodMs: number, dir: number, seed: number) => {
		const t = clock.now + seed;
		const idx = Math.floor(t / periodMs);
		const u = Math.min(1, ((t % periodMs) / periodMs) * (periodMs / 190));
		return (idx + easeOutBack(u)) * (Math.PI / 6) * dir;
	};

	// corner gears: sit ON the frame corners, overlapping both rails
	const GEAR_D = 118;
	const CORNERS = [
		{
			key: 'frame_gear_tl',
			x: -G.openX - G.sideW * 0.42,
			y: -G.openY - G.topH * 0.34,
			dir: 1,
			period: 1600,
			seed: 0,
		},
		{
			key: 'frame_gear_tr',
			x: G.openX + G.sideW * 0.42,
			y: -G.openY - G.topH * 0.34,
			dir: -1,
			period: 1900,
			seed: 400,
		},
		{
			key: 'frame_gear_bl',
			x: -G.openX - G.sideW * 0.42,
			y: G.openY + G.botH * 0.5,
			dir: -1,
			period: 1750,
			seed: 800,
		},
		{
			key: 'frame_gear_br',
			x: G.openX + G.sideW * 0.42,
			y: G.openY + G.botH * 0.5,
			dir: 1,
			period: 2050,
			seed: 1200,
		},
	];
	const cornerFlare = (seed: number) => {
		const wave = Math.max(0, Math.sin((clock.now + seed) / 315));
		return wave ** 12;
	};
	const gearLightAlpha = (seed: number) =>
		0.08 + lightFlicker(seed + 210) * 0.25 + cornerFlare(seed) * 0.42;

	const vortexPulse = $derived(0.22 + lightFlicker(5100) * 0.42);
	const vortexFlare = $derived(cornerFlare(620) * 0.5);

	// glow pulse behind the frame during free spins (unchanged behavior)
	let glowAlpha = $state(0);
	let glowShown = $state(false);
	let token: TweenToken = createTweenToken();

	const startPulse = async () => {
		token.cancelled = true;
		token = createTweenToken();
		const t = token;
		glowShown = true;
		await tween({ from: 0, to: 0.45, duration: 400, easing: cubicOut, onUpdate: (v) => (glowAlpha = v), token: t }); // prettier-ignore
		while (!t.cancelled) {
			await tween({ from: 0.45, to: 0.22, duration: 700, easing: sineInOut, onUpdate: (v) => (glowAlpha = v), token: t }); // prettier-ignore
			await tween({ from: 0.22, to: 0.45, duration: 700, easing: sineInOut, onUpdate: (v) => (glowAlpha = v), token: t }); // prettier-ignore
		}
	};

	const stopPulse = async () => {
		token.cancelled = true;
		token = createTweenToken();
		await tween({ from: glowAlpha, to: 0, duration: 350, easing: cubicOut, onUpdate: (v) => (glowAlpha = v), token }); // prettier-ignore
		glowShown = false;
	};

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => startPulse(),
		boardFrameGlowHide: () => {
			if (glowShown) stopPulse();
		},
	});

	const cx = $derived(context.stateGameDerived.boardLayout().x);
	const cy = $derived(context.stateGameDerived.boardLayout().y);
</script>

{#if glowShown}
	<Rectangle
		zIndex={-1}
		anchor={0.5}
		x={cx}
		y={cy}
		width={context.stateGameDerived.boardLayout().width * 1.12}
		height={context.stateGameDerived.boardLayout().height * 1.16}
		borderRadius={32}
		backgroundColor={0x3a1030}
		borderColor={0xf07f2e}
		borderWidth={6}
		alpha={glowAlpha}
	/>
{/if}

<!-- Each rail gets its own clipped light pass, so no highlight can wash over the reels. -->
{#each RAILS as rail (rail.key)}
	<Sprite
		key={rail.key}
		anchor={rail.anchor}
		x={cx + rail.x}
		y={cy + rail.y}
		width={rail.width}
		height={rail.height}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key={rail.key}
			anchor={rail.anchor}
			blendMode="add"
			tint={LIGHT_TINT_WARM}
			x={cx + rail.x}
			y={cy + rail.y}
			width={rail.width}
			height={rail.height}
			alpha={railIdleAlpha(rail)}
		/>
	{/if}
	{@const rp = railProgress(rail)}
	{#if !performanceProfile.reducedEffects && rp >= 0}
		{@const rlp = railLocalProgress(rail, rp)}
		<Container>
			<Sprite
				isMask
				key={rail.key}
				anchor={rail.anchor}
				x={cx + rail.x}
				y={cy + rail.y}
				width={rail.width}
				height={rail.height}
			/>
			<Sprite
				key="part_gleam_bar"
				anchor={0.5}
				blendMode="add"
				tint={LIGHT_TINT_HOT}
				x={cx + rail.x + railLightX(rail, rlp)}
				y={cy + rail.y + railLightY(rail, rlp)}
				rotation={rail.axis === 'x' ? -0.24 * rail.dir : 0.2 * rail.dir}
				width={rail.axis === 'x' ? 92 : rail.width * 1.65}
				height={rail.axis === 'x' ? rail.height * 1.65 : 92}
				alpha={railHotAlpha(rail, rp)}
			/>
			<Sprite
				key="part_gleam_bar"
				anchor={0.5}
				blendMode="add"
				tint={LIGHT_TINT_COLD}
				x={cx + rail.x + railLightX(rail, rlp) - (rail.axis === 'x' ? rail.dir * 68 : 0)}
				y={cy + rail.y + railLightY(rail, rlp) - (rail.axis === 'y' ? rail.dir * 68 : 0)}
				rotation={rail.axis === 'x' ? -0.24 * rail.dir : 0.2 * rail.dir}
				width={rail.axis === 'x' ? 36 : rail.width * 1.25}
				height={rail.axis === 'x' ? rail.height * 1.35 : 36}
				alpha={railColdAlpha(rail, rp)}
			/>
		</Container>
	{/if}
{/each}

<!-- Crown vortex: warm core, counter-rotating cool reflection, and sharp local flare. -->
{#if !performanceProfile.reducedEffects}
	<Sprite
		key="particle_bubble"
		anchor={0.5}
		blendMode="add"
		tint={LIGHT_TINT_WARM}
		x={cx + FRAME_VORTEX_OFFSET.x}
		y={cy + FRAME_VORTEX_OFFSET.y}
		width={146 + vortexFlare * 42}
		height={146 + vortexFlare * 42}
		alpha={0.12 + vortexFlare * 0.2}
	/>
{/if}
<Sprite
	key="frame_emblem_vortex"
	anchor={0.5}
	x={cx + FRAME_VORTEX_OFFSET.x}
	y={cy + FRAME_VORTEX_OFFSET.y}
	rotation={clock.now * 0.0009}
	width={104}
	height={104}
/>
{#if !performanceProfile.reducedEffects}
	<Sprite
		key="frame_emblem_vortex"
		anchor={0.5}
		blendMode="add"
		tint={LIGHT_TINT_HOT}
		x={cx + FRAME_VORTEX_OFFSET.x}
		y={cy + FRAME_VORTEX_OFFSET.y}
		rotation={clock.now * 0.0009}
		width={104}
		height={104}
		alpha={vortexPulse}
	/>
	<Sprite
		key="frame_emblem_vortex"
		anchor={0.5}
		blendMode="add"
		tint={LIGHT_TINT_COLD}
		x={cx + FRAME_VORTEX_OFFSET.x}
		y={cy + FRAME_VORTEX_OFFSET.y}
		rotation={-clock.now * 0.00055}
		width={96}
		height={96}
		alpha={0.12 + vortexFlare * 0.28}
	/>
{/if}

<!-- Corner gears keep their readable base art and carry independent metallic flashes. -->
{#each CORNERS as gear (gear.key)}
	{@const gearRotation = gearRot(gear.period, gear.dir, gear.seed)}
	{@const flare = cornerFlare(gear.seed)}
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="particle_bubble"
			anchor={0.5}
			blendMode="add"
			tint={gear.dir === 1 ? LIGHT_TINT_HOT : LIGHT_TINT_COLD}
			x={cx + gear.x}
			y={cy + gear.y}
			width={GEAR_D * (0.82 + flare * 0.45)}
			height={GEAR_D * (0.82 + flare * 0.45)}
			alpha={0.06 + flare * 0.34}
		/>
	{/if}
	<Sprite
		key={gear.key}
		anchor={0.5}
		x={cx + gear.x}
		y={cy + gear.y}
		rotation={gearRotation}
		width={GEAR_D}
		height={GEAR_D}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key={gear.key}
			anchor={0.5}
			blendMode="add"
			tint={gear.dir === 1 ? LIGHT_TINT_HOT : LIGHT_TINT_COLD}
			x={cx + gear.x}
			y={cy + gear.y}
			rotation={gearRotation}
			width={GEAR_D}
			height={GEAR_D}
			alpha={gearLightAlpha(gear.seed)}
		/>
	{/if}
	{#if !performanceProfile.reducedEffects && flare > 0.03}
		<Sprite
			key="part_gleam_bar"
			anchor={0.5}
			blendMode="add"
			tint={LIGHT_TINT_HOT}
			x={cx + gear.x}
			y={cy + gear.y}
			rotation={gearRotation * 0.35}
			width={14}
			height={GEAR_D * 1.1}
			alpha={flare * 0.8}
		/>
	{/if}
{/each}
