<script lang="ts" module>
	import { GlowFilter } from 'pixi-filters';

	// shared, stateless — one instance for all symbols
	const WIN_GLOW = new GlowFilter({
		distance: 14,
		outerStrength: 2.4,
		innerStrength: 0,
		color: 0xf07f2e, // lantern amber
		quality: 0.2,
	});
	// white-hot rim for the first beat of a win / a detonation — reads the cell sharply
	const WIN_FLASH = new GlowFilter({
		distance: 20,
		outerStrength: 3.6,
		innerStrength: 0.6,
		color: 0xffffff,
		quality: 0.2,
	});
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { sineInOut, elasticOut, cubicOut, cubicIn } from 'svelte/easing';
	import { Container, Sprite, Text } from 'pixi-svelte';

	import type { SymbolState } from '../game/types';
	import { getSymbolInfo } from '../game/utils';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { holeState } from '../game/blackHole.svelte';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';
	import { clock } from '../game/clock.svelte';
	import { performanceProfile } from '../game/performance.svelte';
	import { SYMBOL_FX } from '../game/symbolFx';
	import {
		LIGHT_TINT_COLD,
		LIGHT_TINT_HOT,
		LIGHT_TINT_WARM,
		lightSweepAlpha,
		lightSweepProgress,
		sceneLightPulse,
	} from '../game/light.svelte';

	type Props = {
		x?: number;
		y?: number;
		// board-space cell position when a wrapper owns the transform (tumble
		// path) — the infall vector must aim from the CELL, not local (0,0)
		originX?: number;
		originY?: number;
		state: SymbolState;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	let scaleX = $state(1);
	let scaleY = $state(1);
	let rotation = $state(0);
	let alpha = $state(1);
	let offX = $state(0); // spaghettification travel offset (board px)
	let offY = $state(0);
	let glowing = $state(false);
	let whiteHot = $state(false); // white-hot rim for the win/explosion first beat
	let flashAlpha = $state(0); // additive flash/shockwave disc over the cell
	let flashScale = $state(1);
	let suctionActive = $state(false);
	let suctionProgress = $state(0);
	let suctionDx = $state(0);
	let suctionDy = $state(0);
	let suctionDistance = $state(1);
	let suctionStartAngle = $state(0);
	let suctionTurn = $state(1);
	let impactAlpha = $state(0);
	let impactScale = $state(0.3);
	let symbolLabelAlpha = $state(0);
	let symbolLabelScale = $state(0.55);
	let symbolLabelLift = $state(8);

	// Suction energy stays in the black-hole palette. The old rose/red shard
	// burst read like an unrelated explosion and multiplied sprites per winner.
	const TRAIL_TINT_MAP: Record<string, number> = {
		symbol_H1: 0xffca62,
		symbol_H2: 0x69e8d6,
		symbol_H3: 0x82dcff,
		symbol_H4: 0xc59aff,
		symbol_H5: 0xc68cff,
		symbol_L1: 0x72e6d1,
		symbol_L2: 0x7fdcff,
		symbol_L3: 0xffc969,
		symbol_L4: 0xb993ff,
		symbol_W: 0xd69bff,
		symbol_S: 0xffb45c,
	};
	const AFTERIMAGE_LAGS = performanceProfile.reducedEffects ? [0.085] : [0.06, 0.125];
	const SUCTION_MOTES = performanceProfile.reducedEffects ? [0] : [0, 1];

	let token: TweenToken = createTweenToken();
	let symbolLabelToken: TweenToken = createTweenToken();
	let previousLabel = '';
	let previousState: SymbolState | undefined;

	// ---- idle rig (pseudo-spine): gears tick, cores spin, flames flicker,
	// glints twinkle — driven by the shared clock, only while the symbol is
	// resting (static/land); frozen mid-explosion so parts ride the infall.
	const symbolName = $derived(props.symbolInfo.assetKey.replace('symbol_', ''));
	const symbolLabel = $derived(symbolName === 'W' ? 'WILD' : symbolName === 'S' ? 'FS' : '');
	const fx = $derived(SYMBOL_FX[symbolName]);
	const rigActive = $derived(
		props.state === 'static' || props.state === 'land' || props.state === 'spin',
	);
	// per-instance phase seed so 20 cells never move in lockstep
	const seed = Math.random() * 1000;
	const trailTint = $derived(TRAIL_TINT_MAP[props.symbolInfo.assetKey] ?? LIGHT_TINT_HOT);
	const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
	const suctionPoint = (progress: number) => {
		const p = clamp01(progress);
		const radius = suctionDistance * Math.pow(1 - p, 1.22);
		const orbit = suctionTurn * Math.PI * (0.04 * p + 0.48 * p * p);
		const angle = suctionStartAngle + orbit;
		return {
			x: suctionDx + Math.cos(angle) * radius,
			y: suctionDy + Math.sin(angle) * radius,
		};
	};
	const suctionRotation = (progress: number) => {
		const p0 = suctionPoint(Math.max(0, progress - 0.008));
		const p1 = suctionPoint(Math.min(1, progress + 0.008));
		return Math.atan2(p1.y - p0.y, p1.x - p0.x) - Math.PI / 2;
	};
	const afterimageProps = (lag: number, index: number) => {
		const rawProgress = suctionProgress - lag;
		const p = clamp01(rawProgress);
		const point = suctionPoint(p);
		const arrivalFade = 1 - clamp01((p - 0.78) / 0.22);
		const stretch = 1 + Math.sin(p * Math.PI) * 0.42;
		return {
			x: point.x,
			y: point.y,
			rotation: suctionRotation(p),
			width: SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * (0.72 - index * 0.1) * arrivalFade,
			height:
				SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * (stretch - index * 0.08) * arrivalFade,
			alpha: suctionActive && rawProgress > 0 ? (0.2 - index * 0.045) * arrivalFade : 0,
		};
	};
	const suctionMoteProps = (index: number) => {
		const lag = 0.025 + index * 0.035;
		const p = clamp01(suctionProgress - lag);
		const point = suctionPoint(p);
		const tangent = suctionRotation(p) + Math.PI / 2;
		const side = index % 2 === 0 ? 1 : -1;
		const spread = Math.sin((clock.now + seed + index * 91) / 85) * (4 + index * 1.5) * side;
		const fade = (1 - index / SUCTION_MOTES.length) * (1 - clamp01((suctionProgress - 0.9) / 0.1));
		return {
			x: point.x + Math.cos(tangent + Math.PI / 2) * spread,
			y: point.y + Math.sin(tangent + Math.PI / 2) * spread,
			rotation: tangent,
			width: 7 - index,
			height: 25 - index * 3,
			alpha: suctionActive && suctionProgress > lag ? fade * 0.62 : 0,
		};
	};
	const suctionBeamProps = () => {
		const head = suctionPoint(suctionProgress);
		const tail = suctionPoint(Math.max(0, suctionProgress - 0.28));
		const dx = head.x - tail.x;
		const dy = head.y - tail.y;
		const length = Math.hypot(dx, dy);
		const arrivalFade = 1 - clamp01((suctionProgress - 0.9) / 0.1);
		return {
			x: (head.x + tail.x) * 0.5,
			y: (head.y + tail.y) * 0.5,
			rotation: Math.atan2(dy, dx) - Math.PI / 2,
			width: 10,
			height: Math.max(1, length * 1.12),
			alpha: suctionActive ? 0.28 * arrivalFade : 0,
		};
	};
	const PART_SCALE = SYMBOL_SIZE / 512; // part coords/sizes are 512-space
	const SYMBOL_LIGHT_INTENSITY = 1.4;
	const SYMBOL_LIGHT_SPEED = 1.4;
	const px = (v: number) => (v - 256) * PART_SCALE * 0.94;
	const glintProgress = (periodMs: number, sweepMs: number, phase = 0) =>
		lightSweepProgress(periodMs / SYMBOL_LIGHT_SPEED, sweepMs / SYMBOL_LIGHT_SPEED, seed + phase);
	const glintAlpha = (progress: number, maxAlpha: number, phase = 0) =>
		Math.min(
			1,
			lightSweepAlpha(progress, seed + phase) *
				maxAlpha *
				SYMBOL_LIGHT_INTENSITY *
				(0.82 + sceneLightPulse() * 0.28),
		);
	const symbolGlintProgress = () => glintProgress(4800 + (seed % 900), 650, 1700);
	const partGlintProgress = (index: number) =>
		glintProgress(4200 + ((seed + index * 211) % 1000), 440, 900 + index * 720);
	const easeOutBack = (u: number) => {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
	};
	const gearRot = (periodMs: number, stepRad: number, dir: number) => {
		const t = clock.now + seed;
		const idx = Math.floor(t / periodMs);
		const u = Math.min(1, ((t % periodMs) / periodMs) * (periodMs / 170));
		return (idx + easeOutBack(u)) * stepRad * dir;
	};
	const idleRock = $derived(
		rigActive && fx?.rock
			? Math.sin(((clock.now + seed) / fx.rock.periodMs) * Math.PI * 2) * fx.rock.amp
			: 0,
	);
	const flameFlicker = $derived.by(() => {
		const t = clock.now + seed;
		return {
			sy: 1 + 0.16 * Math.sin(t / 47) + 0.09 * Math.sin(t / 23),
			sx: 1 + 0.06 * Math.sin(t / 31 + 1.3),
			alpha: 0.9 + 0.1 * Math.sin(t / 37),
		};
	});
	const sparkleAlpha = (phase: number) => {
		const s = Math.sin(((clock.now + seed) * SYMBOL_LIGHT_SPEED) / 1050 + phase);
		return Math.min(1, Math.max(0, s) ** 4 * 0.78 * SYMBOL_LIGHT_INTENSITY);
	};
	const lightPulseSin = (periodMs: number) =>
		Math.sin((((clock.now + seed) * SYMBOL_LIGHT_SPEED) / periodMs) * Math.PI * 2);
	const pulseCycle = (periodMs: number) => ((((clock.now + seed) / periodMs) % 1) + 1) % 1;
	// eyes closed for a short window each period (per-cell desync via seed)
	const blinkClosed = (periodMs: number, closedMs: number) =>
		(clock.now + seed) % periodMs < closedMs;
	// gleam sweep: 0..1 while the light bar crosses, -1 when resting
	const gleamProgress = (periodMs: number, sweepMs: number) => {
		const t = (clock.now + seed) % periodMs;
		return t < sweepMs ? t / sweepMs : -1;
	};

	const reset = () => {
		scaleX = 1;
		scaleY = 1;
		rotation = 0;
		alpha = 1;
		offX = 0;
		offY = 0;
		glowing = false;
		whiteHot = false;
		flashAlpha = 0;
		suctionActive = false;
		suctionProgress = 0;
		impactAlpha = 0;
		impactScale = 0.3;
	};

	const setScale = (value: number) => {
		scaleX = value;
		scaleY = value;
	};

	// idle: gentle breathing zoom, desynced per symbol so they don't pulse in lockstep
	const playStatic = async (t: TweenToken) => {
		reset();
		const amp = 1.05 + Math.random() * 0.02; // ~5–7% gentle zoom
		const period = 1300 + Math.random() * 500; // varied period
		await tween({
			from: 1,
			to: amp,
			duration: period * (0.3 + Math.random() * 0.7),
			easing: sineInOut,
			onUpdate: setScale,
			token: t,
		}); // prettier-ignore (random phase)
		while (!t.cancelled) {
			await tween({ from: amp, to: 1, duration: period, easing: sineInOut, onUpdate: setScale, token: t }); // prettier-ignore
			await tween({ from: 1, to: amp, duration: period, easing: sineInOut, onUpdate: setScale, token: t }); // prettier-ignore
		}
	};

	// land: squash + bouncy settle + a little rotation wiggle (random direction)
	const playLand = async (t: TweenToken) => {
		alpha = 1;
		glowing = false;
		const wiggle = (Math.random() < 0.5 ? -1 : 1) * 0.1; // ~6° wiggle
		await Promise.all([
			tween({ from: 0.84, to: 1, duration: 460, easing: elasticOut, onUpdate: (v) => (scaleY = v), token: t }), // prettier-ignore
			tween({ from: 1.14, to: 1, duration: 460, easing: elasticOut, onUpdate: (v) => (scaleX = v), token: t }), // prettier-ignore
			tween({ from: wiggle, to: 0, duration: 460, easing: elasticOut, onUpdate: (v) => (rotation = v), token: t }), // prettier-ignore
		]);
		props.oncomplete?.();
	};

	// win: a sharp white-hot readability POP (so you can see what won) then an amber pulse
	const playWin = async (t: TweenToken) => {
		reset();
		glowing = true;
		whiteHot = true;
		// readability flash: bright additive disc over the cell, quick decay
		flashScale = 1.6;
		tween({ from: 0.9, to: 0, duration: 340, easing: cubicOut, onUpdate: (v) => (flashAlpha = v), token: t }).then(() => { whiteHot = false; }); // prettier-ignore
		let firstCycle = true;

		do {
			tween({ from: 0.65, to: 1, duration: 170, easing: cubicOut, onUpdate: (v) => (alpha = v), token: t }); // prettier-ignore
			await tween({
				from: 1,
				to: 1.24,
				duration: 200,
				easing: cubicOut,
				onUpdate: setScale,
				token: t,
			}); // prettier-ignore (snappy punch)
			await tween({
				from: 1.24,
				to: 1,
				duration: 280,
				easing: elasticOut,
				onUpdate: setScale,
				token: t,
			}); // prettier-ignore (springy settle)
			if (firstCycle) {
				props.oncomplete?.();
				firstCycle = false;
			}
		} while (props.loop && !t.cancelled);
	};

	// post-win: dimmed static (non-winners / already-paid symbols)
	const playPostWinStatic = (t: TweenToken) => {
		reset();
		tween({ from: 1, to: 0.6, duration: 150, onUpdate: (v) => (alpha = v), token: t });
		props.oncomplete?.();
	};

	// Three-beat black-hole feed: charge at the cell, accelerate through a broad
	// orbital arc with colored afterimages, then collapse into a horizon impact.
	const playExplosion = async (t: TweenToken) => {
		reset();
		glowing = true;
		whiteHot = true;
		const sx = props.originX ?? props.x ?? 0;
		const sy = props.originY ?? props.y ?? 0;
		const dx = holeState.x - sx;
		const dy = holeState.y - sy;
		const dist = Math.hypot(dx, dy);
		suctionDx = dx;
		suctionDy = dy;
		suctionDistance = Math.max(1, dist);
		suctionStartAngle = Math.atan2(-dy, -dx);
		suctionTurn = (Math.floor(seed + sx * 0.07 + sy * 0.11) & 1) === 0 ? 1 : -1;
		suctionActive = true;

		// Capture: the lens closes inward around the symbol before gravity wins.
		// This replaces the old outward red shard explosion.
		flashScale = 1.28;
		flashAlpha = 0.84;
		const launchRotation = suctionRotation(0);
		await Promise.all([
			tween({ from: 0, to: launchRotation, duration: 150, easing: cubicOut, onUpdate: (v) => (rotation = v), token: t }), // prettier-ignore
			tween({ from: 1, to: 0.92, duration: 150, easing: cubicOut, onUpdate: (v) => (scaleX = v), token: t }), // prettier-ignore
			tween({ from: 1, to: 1.1, duration: 150, easing: cubicOut, onUpdate: (v) => (scaleY = v), token: t }), // prettier-ignore
			tween({ from: 1.28, to: 0.46, duration: 190, easing: cubicIn, onUpdate: (v) => (flashScale = v), token: t }), // prettier-ignore
			tween({ from: 0.84, to: 0.08, duration: 190, easing: cubicOut, onUpdate: (v) => (flashAlpha = v), token: t }), // prettier-ignore
		]);
		if (t.cancelled) return;
		flashAlpha = 0;
		whiteHot = false;
		glowing = false;

		// Short per-cell hold prevents a whole cluster from reading as one flat
		// texture and gives the capture flashes a loose, organic cadence.
		const launchHold =
			Math.max(20, Math.min(150, (900 - dist) * 0.18)) + (Math.floor(seed) % 3) * 10;
		await tween({
			from: 0,
			to: 1,
			duration: launchHold,
			onUpdate: (v) => {
				scaleX = 0.92 - Math.sin(v * Math.PI) * 0.035;
				scaleY = 1.1 + Math.sin(v * Math.PI) * 0.055;
			},
			token: t,
		});

		const flightDuration = 540 + Math.min(140, dist * 0.12);
		await tween({
			from: 0,
			to: 1,
			duration: flightDuration,
			easing: cubicIn,
			token: t,
			onUpdate: (p) => {
				suctionProgress = p;
				const point = suctionPoint(p);
				offX = point.x;
				offY = point.y;
				rotation = suctionRotation(p) + suctionTurn * Math.sin(p * Math.PI * 3) * 0.035;
				const stretch = Math.sin(Math.min(1, p / 0.84) * Math.PI) * 0.86;
				const arrival = clamp01((p - 0.78) / 0.22);
				const collapse = 1 - Math.pow(arrival, 1.55) * 0.96;
				scaleY = Math.max(0.055, (1.1 + stretch) * collapse);
				scaleX = Math.max(0.07, (0.92 - p * 0.24) * collapse);
				alpha = 1 - Math.pow(clamp01((p - 0.91) / 0.09), 1.2);
			},
		});
		if (t.cancelled) return;

		glowing = false;
		alpha = 0;
		offX = dx;
		offY = dy;
		impactAlpha = 0.95;
		impactScale = 0.32;
		context.eventEmitter.broadcast({
			type: 'blackHoleAbsorb',
			strength: Math.min(1.25, 0.7 + dist / 1400),
		});
		await Promise.all([
			tween({ from: 0.95, to: 0, duration: 190, easing: cubicOut, onUpdate: (v) => (impactAlpha = v), token: t }), // prettier-ignore
			tween({ from: 0.32, to: 1.05, duration: 190, easing: cubicOut, onUpdate: (v) => (impactScale = v), token: t }), // prettier-ignore
		]);
		suctionActive = false;
		props.oncomplete?.();
	};

	const play = (state: SymbolState, t: TweenToken) => {
		if (state === 'static') return playStatic(t);
		if (state === 'land') return playLand(t);
		if (state === 'win') return playWin(t);
		if (state === 'postWinStatic') return playPostWinStatic(t);
		if (state === 'explosion') return playExplosion(t);
		// 'spin' and any cascading reel states: plain sprite
		reset();
		props.oncomplete?.();
	};

	const revealSymbolLabel = async () => {
		symbolLabelToken.cancelled = true;
		symbolLabelToken = createTweenToken();
		const t = symbolLabelToken;
		symbolLabelAlpha = 0;
		symbolLabelScale = 0.55;
		symbolLabelLift = 8;
		await Promise.all([
			tween({ from: 0, to: 1, duration: 180, easing: cubicOut, onUpdate: (value) => (symbolLabelAlpha = value), token: t }), // prettier-ignore
			tween({ from: 0.55, to: 1.16, duration: 260, easing: elasticOut, onUpdate: (value) => (symbolLabelScale = value), token: t }), // prettier-ignore
			tween({ from: 8, to: 0, duration: 240, easing: cubicOut, onUpdate: (value) => (symbolLabelLift = value), token: t }), // prettier-ignore
		]);
		if (t.cancelled) return;
		await tween({
			from: symbolLabelScale,
			to: 1,
			duration: 150,
			easing: cubicOut,
			onUpdate: (value) => (symbolLabelScale = value),
			token: t,
		});
	};

	$effect(() => {
		props.state;
		props.symbolInfo;
		untrack(() => {
			token.cancelled = true;
			token = createTweenToken();
			play(props.state, token);
		});
	});

	$effect(() => {
		const label = symbolLabel;
		const state = props.state;
		untrack(() => {
			if (!label) {
				symbolLabelToken.cancelled = true;
				symbolLabelAlpha = 0;
				symbolLabelScale = 0.55;
				symbolLabelLift = 8;
			} else if (
				(state === 'land' && previousState !== 'land') ||
				(previousLabel !== label && state !== 'spin')
			) {
				revealSymbolLabel();
			} else if (symbolLabelAlpha === 0 && state !== 'spin') {
				symbolLabelAlpha = 1;
				symbolLabelScale = 1;
				symbolLabelLift = 0;
			}
			previousLabel = label;
			previousState = state;
		});
	});
</script>

{#if suctionActive}
	<Sprite
		key="part_gleam_bar"
		anchor={0.5}
		blendMode="add"
		tint={trailTint}
		{...suctionBeamProps()}
	/>
	{#each AFTERIMAGE_LAGS as lag, index (lag)}
		<Sprite
			key={props.symbolInfo.assetKey}
			anchor={0.5}
			blendMode="add"
			tint={trailTint}
			{...afterimageProps(lag, index)}
		/>
	{/each}
	{#each SUCTION_MOTES as mote (mote)}
		<Sprite
			key="particle_gold_fleck"
			anchor={0.5}
			blendMode="add"
			tint={mote % 2 === 0 ? 0x9eeeff : 0xffd37d}
			{...suctionMoteProps(mote)}
		/>
	{/each}
{/if}

<Container
	x={(props.x ?? 0) + offX}
	y={(props.y ?? 0) + offY}
	scale={{ x: scaleX, y: scaleY }}
	{rotation}
	{alpha}
	filters={performanceProfile.reducedEffects
		? []
		: whiteHot
			? [WIN_FLASH]
			: glowing
				? [WIN_GLOW]
				: []}
>
	<Container rotation={idleRock}>
		<Sprite
			anchor={0.5}
			key={props.symbolInfo.assetKey}
			width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
			height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
		/>
		{@const sgp = symbolGlintProgress()}
		{#if !performanceProfile.reducedEffects && rigActive && sgp >= 0}
			<Container>
				<Sprite
					isMask
					anchor={0.5}
					key={props.symbolInfo.assetKey}
					width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
					height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
				/>
				<Sprite
					anchor={0.5}
					key="part_gleam_bar"
					blendMode="add"
					tint={LIGHT_TINT_HOT}
					rotation={-0.58}
					x={(sgp - 0.5) * SYMBOL_SIZE * 1.45}
					y={(0.5 - sgp) * SYMBOL_SIZE * 0.3}
					width={SYMBOL_SIZE * 0.28}
					height={SYMBOL_SIZE * 1.35}
					alpha={glintAlpha(sgp, 0.68, 11)}
				/>
				<Sprite
					anchor={0.5}
					key="part_gleam_bar"
					blendMode="add"
					tint={LIGHT_TINT_COLD}
					rotation={-0.58}
					x={(sgp - 0.5) * SYMBOL_SIZE * 1.45 - SYMBOL_SIZE * 0.16}
					y={(0.5 - sgp) * SYMBOL_SIZE * 0.3}
					width={SYMBOL_SIZE * 0.12}
					height={SYMBOL_SIZE * 1.1}
					alpha={glintAlpha(sgp, 0.3, 23)}
				/>
			</Container>
		{/if}
		{#if fx && rigActive}
			{#if fx.blink && blinkClosed(fx.blink.periodMs, fx.blink.closedMs)}
				<Sprite
					anchor={0.5}
					key={fx.blink.key}
					width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
					height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
				/>
			{/if}
			{#each fx.spins ?? [] as spin, si (spin.key)}
				{@const spinRotation = (clock.now + seed) * spin.speed}
				{@const spinGp = partGlintProgress(si)}
				<Sprite
					anchor={0.5}
					key={spin.key}
					x={px(spin.x)}
					y={px(spin.y)}
					rotation={spinRotation}
					width={spin.size * PART_SCALE * 0.94}
					height={spin.size * PART_SCALE * 0.94}
				/>
				{#if !performanceProfile.reducedEffects && spinGp >= 0}
					<Sprite
						anchor={0.5}
						key={spin.key}
						blendMode="add"
						tint={LIGHT_TINT_WARM}
						x={px(spin.x)}
						y={px(spin.y)}
						rotation={spinRotation}
						width={spin.size * PART_SCALE * 0.94}
						height={spin.size * PART_SCALE * 0.94}
						alpha={glintAlpha(spinGp, 0.48, si * 19)}
					/>
				{/if}
			{/each}
			{#each fx.gears ?? [] as g, gi (g.key)}
				{@const gearRotation = gearRot(g.periodMs, g.stepRad, g.dir)}
				{@const gearGp = partGlintProgress(gi + 4)}
				<Sprite
					anchor={0.5}
					key={g.key}
					x={px(g.x)}
					y={px(g.y)}
					rotation={gearRotation}
					width={g.size * PART_SCALE * 0.94}
					height={g.size * PART_SCALE * 0.94}
				/>
				{#if !performanceProfile.reducedEffects && gearGp >= 0}
					<Sprite
						anchor={0.5}
						key={g.key}
						blendMode="add"
						tint={LIGHT_TINT_HOT}
						x={px(g.x)}
						y={px(g.y)}
						rotation={gearRotation}
						width={g.size * PART_SCALE * 0.94}
						height={g.size * PART_SCALE * 0.94}
						alpha={glintAlpha(gearGp, 0.54, gi * 31)}
					/>
				{/if}
			{/each}
			{#if fx.flame}
				<Sprite
					anchor={{ x: 0.72, y: 0.28 }}
					key={fx.flame.key}
					x={px(fx.flame.x + fx.flame.size * 0.22)}
					y={px(fx.flame.y - fx.flame.size * 0.22)}
					rotation={0.05 * Math.sin((clock.now + seed) / 41)}
					width={fx.flame.size * PART_SCALE * 0.94 * flameFlicker.sx}
					height={fx.flame.size * PART_SCALE * 0.94 * flameFlicker.sy}
					alpha={flameFlicker.alpha}
				/>
			{/if}
			{#if !performanceProfile.reducedEffects && fx.glowPulse}
				{@const glowPulse = lightPulseSin(fx.glowPulse.periodMs)}
				<Sprite
					anchor={0.5}
					key="particle_bubble"
					blendMode="add"
					tint={fx.glowPulse.tint}
					x={px(fx.glowPulse.x)}
					y={px(fx.glowPulse.y)}
					width={fx.glowPulse.maxSize * PART_SCALE * (0.7 + 0.3 * glowPulse)}
					height={fx.glowPulse.maxSize * PART_SCALE * (0.7 + 0.3 * glowPulse)}
					alpha={Math.min(1, (0.32 + 0.22 * glowPulse) * SYMBOL_LIGHT_INTENSITY)}
				/>
			{/if}
			{#if !performanceProfile.reducedEffects && fx.novaRing}
				{@const novaCycle = pulseCycle(fx.novaRing.periodMs / SYMBOL_LIGHT_SPEED)}
				<Sprite
					anchor={0.5}
					key="overlay_ripple"
					blendMode="add"
					tint={fx.novaRing.tint}
					x={px(fx.novaRing.x)}
					y={px(fx.novaRing.y)}
					width={fx.novaRing.maxSize * PART_SCALE * novaCycle}
					height={fx.novaRing.maxSize * PART_SCALE * novaCycle}
					alpha={Math.min(1, (1 - novaCycle) * 0.4 * SYMBOL_LIGHT_INTENSITY)}
				/>
			{/if}
			{#if !performanceProfile.reducedEffects && fx.gleam}
				{@const gp = gleamProgress(
					fx.gleam.periodMs / SYMBOL_LIGHT_SPEED,
					fx.gleam.sweepMs / SYMBOL_LIGHT_SPEED,
				)}
				{#if gp >= 0}
					<Container>
						<Sprite
							isMask
							anchor={0.5}
							key={fx.gleam.maskKey}
							width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width}
							height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
						/>
						<Sprite
							anchor={0.5}
							key="part_gleam_bar"
							blendMode="add"
							rotation={fx.gleam.angle}
							x={(gp - 0.5) * SYMBOL_SIZE * 1.5}
							y={(gp - 0.5) * SYMBOL_SIZE * 0.5}
							width={SYMBOL_SIZE * 0.42}
							height={SYMBOL_SIZE * 1.6}
							alpha={Math.min(1, 0.75 * Math.sin(gp * Math.PI) * SYMBOL_LIGHT_INTENSITY)}
						/>
					</Container>
				{/if}
			{/if}
			{#if !performanceProfile.reducedEffects}
				{#each fx.sparkles ?? [] as sp, si (si)}
					<Sprite
						anchor={0.5}
						key="particle_bubble"
						tint={0xfff2d0}
						blendMode="add"
						x={px(sp.x)}
						y={px(sp.y)}
						rotation={(clock.now + seed) / 900 + sp.phase}
						width={sp.size * PART_SCALE * (0.6 + 0.4 * sparkleAlpha(sp.phase))}
						height={sp.size * PART_SCALE * (0.6 + 0.4 * sparkleAlpha(sp.phase))}
						alpha={sparkleAlpha(sp.phase)}
					/>
				{/each}
			{/if}
		{/if}
	</Container>
	{#if symbolLabel}
		<Text
			text={symbolLabel}
			anchor={0.5}
			y={SYMBOL_SIZE * (symbolName === 'S' ? 0.37 : 0.34) + symbolLabelLift}
			scale={symbolLabelScale}
			alpha={symbolLabelAlpha}
			style={{
				fontFamily: 'proxima-nova',
				fontSize: symbolName === 'S' ? 27 : 25,
				fontWeight: '900',
				letterSpacing: 0,
				fill: 0xfff2a6,
				stroke: { color: 0x240542, width: 5 },
			}}
		/>
	{/if}
</Container>

{#if impactAlpha > 0.01}
	<Sprite
		key="overlay_ripple"
		anchor={0.5}
		blendMode="add"
		tint={trailTint}
		x={suctionDx}
		y={suctionDy}
		width={SYMBOL_SIZE * impactScale}
		height={SYMBOL_SIZE * impactScale * 0.62}
		alpha={impactAlpha * 0.72}
	/>
	<Sprite
		key="particle_gold_fleck"
		anchor={0.5}
		blendMode="add"
		tint={LIGHT_TINT_HOT}
		x={suctionDx}
		y={suctionDy}
		width={SYMBOL_SIZE * impactScale * 0.72}
		height={SYMBOL_SIZE * impactScale * 0.72}
		alpha={impactAlpha}
	/>
{/if}

{#if flashAlpha > 0.01}
	<!-- additive readability flash (win) / inward lens clamp (suction) -->
	<Sprite
		x={props.x}
		y={props.y}
		anchor={0.5}
		key={suctionActive ? 'overlay_ripple' : 'overlay_lantern'}
		blendMode="add"
		tint={suctionActive ? 0x9eeeff : 0xffffff}
		alpha={flashAlpha}
		width={SYMBOL_SIZE * flashScale}
		height={SYMBOL_SIZE * flashScale}
	/>
{/if}
