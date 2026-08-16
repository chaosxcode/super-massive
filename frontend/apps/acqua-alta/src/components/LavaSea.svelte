<script lang="ts">
	// AMBIENT LAVA SEA (owner 2026-07-27): the background art's baked lava pool left a
	// visible horizon line floating above the spin button with dead space up to the
	// board. This layer draws a FULL sea from the board frame's bottom edge down past
	// the screen bottom — same palette + sine crest as the WaterPlane tide, so the
	// board reads as sitting IN the lava.
	//
	// It is ALIVE and REACTIVE (owner):
	//  - intensity rises with the tide level (waterPlaneRise/Set) and flares on mascot
	//    reactions (wins) — crest brightens, waves swell, churn speeds up, then decays
	//  - slow bubble-bursts pop along the crest
	//  - a heat-shimmer band wavers above the surface (additive scroll, no filters)
	//  - an additive UPLIGHT gradient washes the board frame's bottom in molten light
	import { onMount } from 'svelte';
	import type * as PIXI from 'pixi.js';

	import { Container, Graphics, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_SIZES } from '../game/constants';
	import { performanceProfile } from '../game/performance.svelte';

	const context = getContext();
	const L = context.stateLayoutDerived;

	// board-frame geometry — same math the mascot/logo use
	const FRAME_W = BOARD_SIZES.width * 1.26;
	const FRAME_H = FRAME_W * (719 / 694);
	const POS = 1.01;

	// WaterPlane palette (kept in sync by eye — the tide must read as the same fluid)
	const DEEP_COLOR = 0x0a0320;
	const HOT_BAND_COLOR = 0x7a4cff;
	const SURFACE_COLOR = 0xcfe8ff;
	const UPLIGHT_COLOR = 0x7d64ff;

	// body colour lerps brighter as intensity climbs
	const BODY_LO = { r: 0x1d, g: 0x0a, b: 0x42 };
	const BODY_HI = { r: 0x38, g: 0x18, b: 0x7e };

	let phase = $state(0);
	let intensity = $state(0); // 0 calm … 1 raging (tide + win flares)
	let tideLevel = 0;
	let flare = 0; // transient boost, decays per frame

	interface Bubble {
		x: number;
		born: number;
		life: number;
		size: number;
	}
	let bubbles = $state<Bubble[]>([]);
	let nextBubble = 1.2;

	context.eventEmitter.subscribeOnMount({
		waterPlaneRise: (e: { level: number }) => {
			tideLevel = Math.min(e.level, 7);
			flare = Math.min(1, flare + 0.5);
		},
		waterPlaneSet: (e: { level: number }) => {
			tideLevel = Math.min(e.level, 7);
		},
		mascotReact: () => {
			flare = 1;
		},
	});

	onMount(() => {
		let raf = 0;
		let last = performance.now();
		let previousUpdate = 0;
		const frameInterval = 1000 / performanceProfile.targetFps;
		const tick = (t: number) => {
			if (previousUpdate !== 0 && t - previousUpdate < frameInterval) {
				raf = requestAnimationFrame(tick);
				return;
			}
			const dt = Math.min(0.1, (t - last) / 1000);
			last = t;
			previousUpdate = t;
			phase += dt * (1 + intensity * 0.9); // churn speeds up as it rages
			flare = Math.max(0, flare - dt * 0.45); // ~2.2s decay
			const target = Math.min(1, (tideLevel / 7) * 0.55 + flare * 0.6 + 0.08);
			intensity += (target - intensity) * Math.min(1, dt * 3);
			// bubble spawning — busier when raging
			nextBubble -= dt * (1 + intensity * 2);
			if (!performanceProfile.reducedEffects && nextBubble <= 0) {
				nextBubble = 1.4 + Math.random() * 2.2;
				const life = 0.9 + Math.random() * 0.7;
				bubbles = [
					...bubbles.filter((b) => phase - b.born < b.life),
					{
						x: 0.06 + Math.random() * 0.88,
						born: phase,
						life,
						size: 10 + Math.random() * 18,
					},
				];
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	const geom = $derived.by(() => {
		const cs = L.canvasSizes();
		const ml = L.mainLayout();
		const frameBottomY =
			cs.height / 2 + ml.scale * ((ml.height / 2) * POS + FRAME_H / 2 - ml.height / 2);
		// surface tucks 22px behind the frame's opaque bottom border — no gap can show
		return { W: cs.width, H: cs.height, surfaceY: frameBottomY - 22 };
	});

	const waveY = (x: number, t: number, amp: number) =>
		Math.sin(x * 0.018 + t * 1.7) * 5 * amp + Math.sin(x * 0.007 - t * 1.1) * 3 * amp;

	const drawSea = (g: PIXI.Graphics) => {
		const { W, H, surfaceY } = geom;
		const t = phase;
		const amp = 1 + intensity * 0.9;
		const bottom = H + 80; // past the canvas edge (covers the portrait drop too)
		const k = intensity;
		const body =
			((BODY_LO.r + (BODY_HI.r - BODY_LO.r) * k) << 16) |
			((BODY_LO.g + (BODY_HI.g - BODY_LO.g) * k) << 8) |
			(BODY_LO.b + (BODY_HI.b - BODY_LO.b) * k);
		g.clear();
		// body
		g.moveTo(-4, surfaceY + waveY(0, t, amp));
		for (let x = 0; x <= W; x += 16) g.lineTo(x, surfaceY + waveY(x, t, amp));
		g.lineTo(W + 4, bottom);
		g.lineTo(-4, bottom);
		g.closePath();
		g.fill({ color: body, alpha: 0.94 });
		// deep shade lower half
		g.rect(-4, surfaceY + 90, W + 8, bottom - surfaceY - 90);
		g.fill({ color: DEEP_COLOR, alpha: 0.55 });
		// hot molten band under the crest
		g.moveTo(-4, surfaceY + waveY(0, t, amp));
		for (let x = 0; x <= W; x += 16) g.lineTo(x, surfaceY + waveY(x, t, amp));
		for (let x = W; x >= 0; x -= 16) g.lineTo(x, surfaceY + waveY(x, t * 1.04, amp) + 14);
		g.closePath();
		g.fill({ color: HOT_BAND_COLOR, alpha: 0.42 + 0.3 * intensity });
		// white-hot crest line
		g.moveTo(-4, surfaceY + waveY(0, t, amp));
		for (let x = 0; x <= W; x += 12) g.lineTo(x, surfaceY + waveY(x, t, amp));
		g.stroke({ width: 3 + intensity * 1.5, color: SURFACE_COLOR, alpha: 0.65 + 0.3 * intensity });
		// crest bubble-bursts: expanding rings that pop and fade
		for (const bub of bubbles) {
			const age = (phase - bub.born) / bub.life;
			if (age < 0 || age > 1) continue;
			const bx = bub.x * W;
			const by = surfaceY + waveY(bx, t, amp) - 2;
			const rr = bub.size * (0.3 + age * 0.9);
			g.circle(bx, by, rr);
			g.stroke({ width: 2, color: SURFACE_COLOR, alpha: 0.5 * (1 - age) });
			g.circle(bx, by - age * 6, rr * 0.35);
			g.fill({ color: HOT_BAND_COLOR, alpha: 0.4 * (1 - age) });
		}
	};

	// UPLIGHT: stacked additive bands rising from the crest — molten bounce light on
	// the frame's bottom. Drawn as 12 fading strips (no gradient-fill API needed).
	const drawUplight = (g: PIXI.Graphics) => {
		const { W, surfaceY } = geom;
		const bandH = 150 + intensity * 60;
		const steps = 12;
		const baseA = 0.05 + intensity * 0.05;
		g.clear();
		for (let i = 0; i < steps; i++) {
			const a = baseA * (1 - i / steps);
			g.rect(-4, surfaceY - (bandH / steps) * (i + 1), W + 8, bandH / steps + 1);
			g.fill({ color: UPLIGHT_COLOR, alpha: a });
		}
	};
</script>

<Container>
	{#if !performanceProfile.reducedEffects}
		<Graphics draw={drawUplight} blendMode="add" />
	{/if}
	<Graphics draw={drawSea} />
	<!-- HEAT SHIMMER: two additive caustic bands scrolling UP just above the crest -->
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="overlay_caustic"
			blendMode="add"
			anchor={0.5}
			x={geom.W * 0.5 + Math.sin(phase * 0.9) * 24}
			y={geom.surfaceY - 46 - ((phase * 26) % 70)}
			width={geom.W * 1.2}
			height={130}
			alpha={0.07 + intensity * 0.06}
		/>
		<Sprite
			key="overlay_caustic"
			blendMode="add"
			anchor={0.5}
			x={geom.W * 0.5 - Math.sin(phase * 0.7) * 32}
			y={geom.surfaceY - 30 - ((phase * 17 + 35) % 70)}
			width={geom.W * 1.5}
			height={110}
			alpha={0.05 + intensity * 0.05}
		/>
	{/if}
	<!-- drifting molten texture over the body — same caustic art the tide uses -->
	<Sprite
		key="overlay_caustic"
		blendMode="add"
		anchor={0.5}
		x={geom.W * 0.5 + Math.sin(phase * 0.35) * 40}
		y={geom.surfaceY + (geom.H - geom.surfaceY) * 0.55}
		width={geom.W * 1.3}
		height={(geom.H - geom.surfaceY) * 2.4}
		alpha={0.18 + intensity * 0.1}
	/>
	{#if !performanceProfile.reducedEffects}
		<Sprite
			key="overlay_caustic"
			blendMode="add"
			anchor={0.5}
			x={geom.W * 0.5 - Math.sin(phase * 0.22) * 60}
			y={geom.surfaceY + (geom.H - geom.surfaceY) * 0.8}
			width={geom.W * 1.7}
			height={(geom.H - geom.surfaceY) * 3}
			alpha={0.12}
		/>
	{/if}
</Container>
