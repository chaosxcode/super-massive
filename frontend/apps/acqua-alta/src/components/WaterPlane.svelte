<script lang="ts" module>
	export type EmitterEventWaterPlane =
		| { type: 'waterPlaneRise'; level: number } // awaited — 0.6s ease-out per tide level (CONTRACT.md)
		| { type: 'waterPlaneSet'; level: number } // instant — snapshot/resume restore
		| { type: 'waterPlaneSync'; rows: number } // background re-sync from updateGrid (freegame entry/persistence)
		| { type: 'waterPlaneDrain' }; // 0.8s drain — basegame reveal / bonus end

	// QUALITY TIERS: low tier replaces the radial well + particles with a flat
	// tinted rect + animated alpha edge. Auto-engages on sustained < 40fps.
	export const waterQuality = { forceLow: false };
</script>

<script lang="ts">
	// SUPERMASSIVE: the flood is a GRAVITY WELL — a circular event horizon
	// expanding from the black hole at bottom-center, not a flat tide. The well
	// radius is anchored so the book-flooded rows are fully inside the arc at
	// the GRID CORNERS; the extra bulge over mid columns is the lensing fringe.
	// Book-honest: a badge/symbol in row N is inside the arc exactly when the
	// math says row N is engulfed.
	import { onMount } from 'svelte';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics, Rectangle, Sprite } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_SIZES, BLACK_HOLE } from '../game/constants';
	import { SFX } from '../game/soundMap';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';
	import { performanceProfile } from '../game/performance.svelte';

	const WELL_COLOR = 0x14062e; // deep gravity-veil body (engulfed symbols stay readable)
	const WELL_ALPHA = 0.4;
	const HOT_BAND_COLOR = 0x6d3df0; // charged violet band inside the horizon edge
	const HORIZON_COLOR = 0xbfe4ff; // white-blue photon-ring crest / surge flash
	const WELL_PAD = 25; // well runs past the symbol grid to the frame inner border
	const WELL_BOTTOM = (BOARD_SIZES.width * 1.26 * (719 / 694) - BOARD_SIZES.height) / 2 + 6;
	const MAX_ROWS = 7; // level 8+ keeps the board fully engulfed
	const RISE_DURATION = 600;
	const DRAIN_DURATION = 800;
	const LOW_FPS_THRESHOLD = 40;
	const LOW_FPS_FRAMES = 90;

	const HX = BLACK_HOLE.x;
	const HY = BLACK_HOLE.y;

	const context = getContext();

	let waterHeight = $state(0); // engulfed height at the GRID CORNERS, px up from board bottom
	let phase = $state(0);
	let lowQuality = $state(waterQuality.forceLow || performanceProfile.reducedEffects);
	let targetRows = 0;
	let token: TweenToken = createTweenToken();

	type Droplet = { id: number; x: number; y: number; alpha: number; radius: number };
	let spray = $state<Droplet[]>([]);
	let dropletId = 0;

	type Ripple = { id: number; x: number; y: number; alpha: number; scale: number };
	let ripples = $state<Ripple[]>([]);
	let rippleId = 0;
	let surgeAlpha = $state(0); // bright horizon flash on each expansion
	let surgeToken: TweenToken = createTweenToken();

	const levelToHeight = (level: number) => Math.min(level, MAX_ROWS) * SYMBOL_SIZE;

	// well radius for a given corner-coverage height: the arc passes through the
	// grid corners at the covered-row line, bulging higher over mid columns
	const wellRadius = (height: number) =>
		Math.hypot(BOARD_SIZES.width / 2 + WELL_PAD, HY - (BOARD_SIZES.height - height));

	// horizon y at column x (no wobble — geometry only)
	const arcY = (x: number, radius: number) => {
		const dx = x - HX;
		const sq = radius * radius - dx * dx;
		if (sq <= 0) return BOARD_SIZES.height + WELL_BOTTOM;
		return HY - Math.sqrt(sq);
	};

	const animateTo = async (height: number, duration: number, easing: (t: number) => number) => {
		token.cancelled = true;
		token = createTweenToken();
		if (waterHeight === height) return;
		await tween({ from: waterHeight, to: height, duration, easing, onUpdate: (v) => (waterHeight = v), token }); // prettier-ignore
	};

	// ejecta sparks along the new horizon on each expansion
	const spawnSpray = (height: number) => {
		if (lowQuality) return;
		const radius = wellRadius(height);
		for (let i = 0; i < 14; i += 1) {
			const x = Math.random() * BOARD_SIZES.width;
			const y = arcY(x, radius);
			spray.push({
				id: (dropletId += 1),
				x,
				y,
				alpha: 0.9,
				radius: 1.5 + Math.random() * 2.5,
			});
			const droplet = spray[spray.length - 1];
			const lift = 20 + Math.random() * 50;
			const duration = 400 + Math.random() * 300;
			Promise.all([
				tween({ from: y, to: y - lift, duration, easing: cubicOut, onUpdate: (v) => (droplet.y = v) }), // prettier-ignore
				tween({ from: 0.9, to: 0, duration, easing: cubicIn, onUpdate: (v) => (droplet.alpha = v) }), // prettier-ignore
			]).then(() => {
				spray = spray.filter((existing) => existing.id !== droplet.id);
			});
		}
	};

	// expanding gravity ripples along the new horizon
	const spawnRipples = (height: number) => {
		if (lowQuality) return;
		const radius = wellRadius(height);
		for (let i = 0; i < 3; i += 1) {
			const x = (0.15 + 0.35 * i + Math.random() * 0.2) * BOARD_SIZES.width;
			ripples.push({
				id: (rippleId += 1),
				x,
				y: arcY(x, radius),
				alpha: 0.55,
				scale: 0.25,
			});
			const ripple = ripples[ripples.length - 1];
			const duration = 600 + Math.random() * 400;
			Promise.all([
				tween({ from: 0.25, to: 1.1, duration, easing: cubicOut, onUpdate: (v) => (ripple.scale = v) }), // prettier-ignore
				tween({ from: 0.55, to: 0, duration, easing: cubicIn, onUpdate: (v) => (ripple.alpha = v) }), // prettier-ignore
			]).then(() => {
				ripples = ripples.filter((existing) => existing.id !== ripple.id);
			});
		}
	};

	context.eventEmitter.subscribeOnMount({
		waterPlaneRise: async (emitterEvent) => {
			const rows = Math.min(emitterEvent.level, MAX_ROWS);
			const target = levelToHeight(emitterEvent.level);
			targetRows = rows;
			if (target > waterHeight) {
				spawnSpray(target);
				spawnRipples(target);
				if (!lowQuality) {
					surgeToken.cancelled = true;
					surgeToken = createTweenToken();
					surgeAlpha = 0.7;
					tween({ from: 0.7, to: 0, duration: 520, easing: cubicOut, onUpdate: (v) => (surgeAlpha = v), token: surgeToken }); // prettier-ignore
				}
			}
			await animateTo(target, RISE_DURATION, cubicOut);
		},
		waterPlaneSet: (emitterEvent) => {
			targetRows = Math.min(emitterEvent.level, MAX_ROWS);
			token.cancelled = true;
			waterHeight = levelToHeight(emitterEvent.level);
		},
		waterPlaneSync: async (emitterEvent) => {
			if (emitterEvent.rows === targetRows) return;
			const draining = emitterEvent.rows < targetRows;
			targetRows = emitterEvent.rows;
			if (draining) {
				if (emitterEvent.rows === 0 && waterHeight > 0) {
					context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.tideDrain });
				}
				await animateTo(levelToHeight(emitterEvent.rows), DRAIN_DURATION, cubicIn);
			} else {
				await animateTo(levelToHeight(emitterEvent.rows), RISE_DURATION, cubicOut);
			}
		},
		waterPlaneDrain: async () => {
			if (targetRows === 0 && waterHeight === 0) return;
			targetRows = 0;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.tideDrain });
			await animateTo(0, DRAIN_DURATION, cubicIn);
		},
	});

	// rAF clock + fps probe (auto low-quality fallback)
	onMount(() => {
		let rafId = 0;
		let last = performance.now();
		let previousUpdate = 0;
		let slowFrames = 0;
		const frameInterval = 1000 / performanceProfile.targetFps;

		const step = (now: number) => {
			if (previousUpdate !== 0 && now - previousUpdate < frameInterval) {
				rafId = requestAnimationFrame(step);
				return;
			}
			const dt = now - last;
			last = now;
			previousUpdate = now;
			phase = now;

			if (!lowQuality && waterHeight > 0 && dt > 1000 / LOW_FPS_THRESHOLD && dt < 500) {
				slowFrames += 1;
				if (slowFrames >= LOW_FPS_FRAMES) lowQuality = true;
			} else {
				slowFrames = 0;
			}
			if (waterQuality.forceLow) lowQuality = true;

			rafId = requestAnimationFrame(step);
		};

		rafId = requestAnimationFrame(step);
		return () => cancelAnimationFrame(rafId);
	});

	// horizon wobble: gravitational churn along the arc (radius modulation)
	const wobble = (x: number, time: number, amplitude: number) =>
		Math.sin(x / 46 + time) * amplitude + Math.sin(x / 17 - time * 1.7) * amplitude * 0.35;

	// trace the horizon arc left→right into `points` (shared by fill + strokes)
	const traceHorizon = (radius: number, time: number, amplitude: number) => {
		const xL = -WELL_PAD;
		const xR = BOARD_SIZES.width + WELL_PAD;
		const points: { x: number; y: number }[] = [];
		for (let x = xL; x <= xR; x += 8) {
			points.push({ x, y: arcY(x, radius) + wobble(x, time, amplitude) });
		}
		return points;
	};

	const strokePath = (g: PIXI.Graphics, points: { x: number; y: number }[], dy: number) => {
		g.moveTo(points[0].x, points[0].y + dy);
		for (let i = 1; i < points.length; i += 1) g.lineTo(points[i].x, points[i].y + dy);
	};

	// the well: filled arc body + hot band + layered horizon glow, per frame
	const drawWell = (g: PIXI.Graphics) => {
		const height = waterHeight;
		if (height <= 0) return;

		const radius = wellRadius(height);
		const amplitude = Math.min(5, height * 0.2);
		const time = phase / 350;
		const points = traceHorizon(radius, time, amplitude);
		const bottom = BOARD_SIZES.height + WELL_BOTTOM;

		// body
		strokePath(g, points, 0);
		g.lineTo(points[points.length - 1].x, bottom);
		g.lineTo(points[0].x, bottom);
		g.closePath();
		g.fill({ color: WELL_COLOR, alpha: WELL_ALPHA });

		// charged band hugging the inside of the horizon
		const band = Math.min(26, height * 0.6);
		strokePath(g, points, 0);
		for (let i = points.length - 1; i >= 0; i -= 1) {
			g.lineTo(points[i].x, points[i].y + band);
		}
		g.closePath();
		g.fill({ color: HOT_BAND_COLOR, alpha: 0.26 });

		// photon-ring crest: layered strokes, widest first
		strokePath(g, points, 8);
		g.stroke({ color: HOT_BAND_COLOR, alpha: 0.1, width: 14 });
		strokePath(g, points, 3);
		g.stroke({ color: HOT_BAND_COLOR, alpha: 0.22, width: 7 });
		strokePath(g, points, 0);
		g.stroke({ color: HORIZON_COLOR, alpha: 0.55, width: 2 });

		// expansion surge flash sweeping with the horizon
		if (surgeAlpha > 0.01) {
			strokePath(g, points, 0);
			g.stroke({ color: HORIZON_COLOR, alpha: surgeAlpha, width: 8 });
		}
	};

	// mask matching the well body (clips the drifting caustic texture)
	const drawWellMask = (g: PIXI.Graphics) => {
		const height = waterHeight;
		if (height <= 0) return;
		const radius = wellRadius(height);
		const points = traceHorizon(radius, phase / 350, Math.min(5, height * 0.2));
		const bottom = BOARD_SIZES.height + WELL_BOTTOM;
		strokePath(g, points, 0);
		g.lineTo(points[points.length - 1].x, bottom);
		g.lineTo(points[0].x, bottom);
		g.closePath();
		g.fill({ color: 0xffffff, alpha: 1 });
	};

	// lowest point of the horizon (over mid columns) for sprite anchoring
	const crestY = $derived(waterHeight > 0 ? arcY(HX, wellRadius(waterHeight)) : BOARD_SIZES.height);
	const edgePulseAlpha = $derived(0.35 + 0.2 * Math.sin(phase / 250));

	// infalling sparks: matter streaking DOWN into the well along the arc,
	// fully derived from the rAF clock (no extra state)
	const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7];
	const sparkProps = (i: number, time: number) => {
		const cycle = (((time / (2000 + i * 430) + i * 0.37) % 1) + 1) % 1;
		const x = ((i * 0.131 + 0.05 + 0.05 * Math.sin(time / 700 + i * 1.7)) % 1) * BOARD_SIZES.width;
		const yTop = arcY(x, wellRadius(waterHeight)) - (56 + waterHeight * 0.25);
		const y = yTop + cycle * (56 + waterHeight * 0.25);
		const size = 4 + (i % 3) * 3;
		return { x, y, width: size, height: size * (1.6 + cycle), alpha: 0.15 + 0.55 * cycle };
	};
</script>

<BoardContainer>
	{#if waterHeight > 0}
		{#if lowQuality}
			<!-- LOW QUALITY: flat tinted rect + animated alpha edge -->
			<Rectangle
				x={-WELL_PAD}
				y={BOARD_SIZES.height - waterHeight}
				width={BOARD_SIZES.width + WELL_PAD * 2}
				height={waterHeight + WELL_BOTTOM}
				backgroundColor={WELL_COLOR}
				backgroundAlpha={WELL_ALPHA}
			/>
			<Rectangle
				x={-WELL_PAD}
				y={BOARD_SIZES.height - waterHeight - 2}
				width={BOARD_SIZES.width + WELL_PAD * 2}
				height={4}
				backgroundColor={HORIZON_COLOR}
				backgroundAlpha={edgePulseAlpha}
			/>
		{:else}
			<Graphics draw={drawWell} />
			{#if waterHeight > 8}
				<!-- drifting energy texture inside the well, clipped to the arc body -->
				<Container>
					<Graphics isMask draw={drawWellMask} />
					<Sprite
						key="overlay_caustic"
						blendMode="add"
						alpha={0.16}
						x={-20 + 14 * Math.sin(phase / 900)}
						y={crestY - 24 + 10 * Math.cos(phase / 700)}
						width={BOARD_SIZES.width + 40}
						height={Math.max(BOARD_SIZES.height + WELL_BOTTOM - crestY + 48, 140)}
					/>
					<Sprite
						key="overlay_caustic"
						blendMode="add"
						alpha={0.1}
						x={-20 - 18 * Math.sin(phase / 1200)}
						y={crestY - 16 - 8 * Math.cos(phase / 850)}
						width={BOARD_SIZES.width + 40}
						height={Math.max(BOARD_SIZES.height + WELL_BOTTOM - crestY + 48, 140)}
					/>
				</Container>
			{/if}

			<!-- matter streaking down into the horizon -->
			{#if waterHeight > SYMBOL_SIZE * 0.5}
				{#each SPARKS as i (i)}
					<Sprite key="particle_bubble" blendMode="add" anchor={0.5} {...sparkProps(i, phase)} />
				{/each}
			{/if}

			<!-- expanding gravity ripples on each rise -->
			{#each ripples as ripple (ripple.id)}
				<Sprite
					key="overlay_ripple"
					blendMode="add"
					anchor={0.5}
					x={ripple.x}
					y={ripple.y}
					width={SYMBOL_SIZE * 1.6 * ripple.scale}
					height={SYMBOL_SIZE * 0.6 * ripple.scale}
					alpha={ripple.alpha}
				/>
			{/each}

			<!-- ejecta sparks off the horizon -->
			{#each spray as droplet (droplet.id)}
				<Sprite
					key="particle_droplet"
					blendMode="add"
					anchor={0.5}
					x={droplet.x}
					y={droplet.y}
					width={droplet.radius * 7}
					height={droplet.radius * 7}
					alpha={droplet.alpha}
				/>
			{/each}
		{/if}
	{/if}
</BoardContainer>
