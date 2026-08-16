<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventBlackHole =
		| { type: 'gravityMultSet'; mult: number; step: number }
		| { type: 'blackHoleAbsorb'; strength: number }
		| { type: 'blackHoleEject'; strength: number }
		// WildEjecta owns the launch timeline and tells the hole when to spool up
		// and when to fire, so the two can never drift apart.
		| { type: 'blackHoleEjectaCharge'; duration: number }
		| { type: 'blackHoleEjectaBurst' }
		| { type: 'wildEjectaFly'; positions: Position[] };
</script>

<script lang="ts">
	// THE supermassive black hole — a generated cartoon EHT ring VIDEO (flame
	// donut on pure black), composited additively over an opaque shadow disc.
	// Additive blend makes the video's black vanish so only the burning ring
	// glows over the scene; the Graphics disc underneath keeps the shadow
	// truly black. Grows as it feeds (tumble swallows), relaxes each base spin.
	import { onMount } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { BitmapText, Graphics, BaseSprite, Sprite } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { BLACK_HOLE, BOARD_SIZES } from '../game/constants';
	import { holeState } from '../game/blackHole.svelte';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';
	import { performanceProfile } from '../game/performance.svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';

	const context = getContext();
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';

	// desktop: parked right of the board; stacked: centered UNDERNEATH it
	const stacked = $derived(context.stateLayoutDerived.isStacked());
	const HX = $derived(stacked ? 350 : BLACK_HOLE.x);
	const HY = $derived(stacked ? 830 : BLACK_HOLE.y);

	/** Left edge of the gravity-multiplier readout, in BOARD coords, sitting just
	 *  clear of the hole's core. BoardContainer centres board-space BOARD_SIZES/2
	 *  on the main box centre, so the stage's right edge in board coords is
	 *  `BOARD_SIZES.width/2 + mainWidth/2`. The readout is clamped inside that:
	 *  at desktop the hole already sits near the edge, and an unclamped offset
	 *  puts "x100" off-screen. */
	// 'x100' at fontSize 52 in the gold bitmap font, near enough for a bound.
	const MULT_FONT = 52;
	const MULT_HALF_W = 61;
	const multX = $derived.by(() => {
		// STACKED: dead centre over the hole, which is where the spin button sits
		// below it (owner).
		if (stacked) return HX;
		const stageRight = BOARD_SIZES.width / 2 + context.stateLayoutDerived.mainLayout().width / 2;
		// Centre it in the gutter between the hole and the stage edge. There is
		// only ~146px there at desktop, so a full-size readout cannot clear the
		// core entirely — this puts as much of it right of centre as will fit
		// without any of it leaving the stage.
		return Math.min((HX + stageRight) / 2, stageRight - MULT_HALF_W - 8);
	});
	// STACKED: tucked directly UNDER the Reactor meter panel, which sits at
	// HY - 214 and is 92 tall, so its underside is HY - 122. Desktop keeps the
	// readout on the hole's centre line.
	const multY = $derived(stacked ? HY - 122 + 30 : HY);
	$effect(() => {
		holeState.x = HX;
		holeState.y = HY;
	});
	const MAX_LEVEL = 7;
	// shadow-circle geometry measured from the generated still
	const SHADOW_CX = 0.4975;
	const SHADOW_CY = 0.4644;
	const SHADOW_R = 0.1586;

	let level = $state(0);
	let flare = $state(0);
	let intake = $state(0);
	let absorbEnergy = $state(0);
	let gravityMult = $state(1);
	type AbsorbImpact = { id: number; progress: number; strength: number; spin: number };
	let impacts = $state<AbsorbImpact[]>([]);
	let impactId = 0;
	let phase = $state(0);
	let videoTexture = $state<PIXI.Texture | null>(null);
	// wild-ejecta launch: the hole inhales (charge 0->1), then bangs (burst 1->0)
	let ejectaCharge = $state(0);
	let ejectaBurst = $state(0);
	let token: TweenToken = createTweenToken();
	let flareToken: TweenToken = createTweenToken();
	let intakeToken: TweenToken = createTweenToken();
	let ejectaToken: TweenToken = createTweenToken();
	let punchToken: TweenToken = createTweenToken();

	const easeLevel = (target: number, duration: number) => {
		token.cancelled = true;
		token = createTweenToken();
		tween({ from: level, to: Math.min(target, MAX_LEVEL), duration, easing: cubicOut, onUpdate: (v) => (level = v), token }); // prettier-ignore
	};

	const kickFlare = () => {
		flareToken.cancelled = true;
		flareToken = createTweenToken();
		flare = 1;
		tween({ from: 1, to: 0, duration: 900, easing: cubicOut, onUpdate: (v) => (flare = v), token: flareToken }); // prettier-ignore
	};

	const startIntake = (symbolCount: number) => {
		intakeToken.cancelled = true;
		intakeToken = createTweenToken();
		intake = Math.min(1.25, 0.55 + symbolCount * 0.055);
		tween({ from: intake, to: 0, duration: 1250, easing: cubicOut, onUpdate: (v) => (intake = v), token: intakeToken }); // prettier-ignore
	};

	const spawnAbsorbImpact = (strength: number) => {
		const id = (impactId += 1);
		impacts.push({ id, progress: 0, strength, spin: Math.random() * Math.PI * 2 });
		const impactLimit = performanceProfile.reducedEffects ? 2 : 4;
		if (impacts.length > impactLimit) impacts = impacts.slice(-impactLimit);
		// Pushing an object literal into a $state array stores a NEW proxy around it,
		// so the local literal is detached and animating it does nothing (that bug
		// froze every impact ring at progress 0). Always animate the element read
		// back out of the array.
		const impact = impacts[impacts.length - 1];
		absorbEnergy = Math.min(1.8, absorbEnergy + strength * 0.5);
		kickFlare();
		const impactToken = createTweenToken();
		tween({
			from: 0,
			to: 1,
			duration: 460,
			easing: cubicOut,
			onUpdate: (v) => (impact.progress = v),
			token: impactToken,
		}).then(() => {
			impacts = impacts.filter((existing) => existing.id !== id);
		});
	};

	// A short trauma punch on the launch burst so the shot has weight. Small
	// (6px peak) and short, because a tumble detonation may still be decaying.
	const punchBoard = () => {
		punchToken.cancelled = true;
		punchToken = createTweenToken();
		const activeToken = punchToken;
		tween({
			from: 0,
			to: 1,
			duration: 380,
			onUpdate: (progress) => {
				const trauma = (1 - progress) * (1 - progress) * 6;
				context.stateGame.boardShake.x = trauma * Math.sin(progress * 47);
				context.stateGame.boardShake.y = trauma * Math.cos(progress * 33);
			},
			token: activeToken,
		}).then(() => {
			if (activeToken.cancelled) return;
			context.stateGame.boardShake.x = 0;
			context.stateGame.boardShake.y = 0;
		});
	};

	context.eventEmitter.subscribeOnMount({
		tumbleBoardExplode: (e) => {
			startIntake(e.explodingPositions.length);
			kickFlare();
		},
		blackHoleAbsorb: (e) => spawnAbsorbImpact(e.strength),
		blackHoleEject: (e) => {
			spawnAbsorbImpact(e.strength);
			kickFlare();
		},
		// the gravity ladder drives the hole now: each cascade feeds it a step
		gravityMultSet: (e) => {
			gravityMult = e.mult;
			easeLevel(Math.min(7, e.step + 1), 600);
			kickFlare();
		},
		// base spins relax it (fired by the reveal handler); FS never resets
		waterPlaneDrain: () => {
			gravityMult = 1;
			easeLevel(0, 900);
		},
		mascotReact: () => kickFlare(),
		// WildEjecta owns the over-board flight and the launch timeline; the hole
		// owns the two beats that happen AT the hole.
		blackHoleEjectaCharge: ({ duration }) => {
			ejectaToken.cancelled = true;
			ejectaToken = createTweenToken();
			ejectaBurst = 0;
			tween({ from: 0, to: 1, duration, easing: cubicIn, onUpdate: (v) => (ejectaCharge = v), token: ejectaToken }); // prettier-ignore
		},
		blackHoleEjectaBurst: () => {
			ejectaToken.cancelled = true;
			ejectaToken = createTweenToken();
			ejectaCharge = 0; // the in-rushing rings are consumed by the bang
			ejectaBurst = 1;
			absorbEnergy = Math.min(2.4, absorbEnergy + 1.1);
			kickFlare();
			punchBoard();
			tween({ from: 1, to: 0, duration: 620, easing: cubicOut, onUpdate: (v) => (ejectaBurst = v), token: ejectaToken }); // prettier-ignore
		},
	});

	onMount(() => {
		// video texture: muted looping ping-pong clip; black = transparent via 'add'
		const video = document.createElement('video');
		video.src = `${A}video/blackhole_ring.mp4`;
		video.muted = true;
		video.loop = true;
		video.playsInline = true;
		video.crossOrigin = 'anonymous';
		video.play().catch(() => {
			// autoplay may need a gesture — retry on first interaction
			const kick = () => {
				video.play().catch(() => {});
				window.removeEventListener('pointerdown', kick);
			};
			window.addEventListener('pointerdown', kick);
		});
		video.addEventListener('canplay', () => {
			if (!videoTexture) videoTexture = PIXI.Texture.from(video);
		});

		let rafId = 0;
		let previous = 0;
		const frameInterval = 1000 / performanceProfile.targetFps;
		const step = (now: number) => {
			if (previous !== 0 && now - previous < frameInterval) {
				rafId = requestAnimationFrame(step);
				return;
			}
			const delta = previous === 0 ? 16.67 : Math.min(50, now - previous);
			previous = now;
			phase = now;
			absorbEnergy *= Math.pow(0.91, delta / 16.67);
			if (absorbEnergy < 0.002) absorbEnergy = 0;
			rafId = requestAnimationFrame(step);
		};
		rafId = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(rafId);
			video.pause();
			video.src = '';
		};
	});

	// core (shadow) radius: compact at rest, swelling with the gravity ladder
	// (owner: growth is back on, but it should never hog the screen again)
	// the ejecta launch reads as one physical action: the core INHALES during the
	// charge, then bangs outward on the burst.
	const coreR = $derived(
		96 +
			level * 7 +
			flare * 8 +
			intake * 7 +
			absorbEnergy * 9 +
			3 * Math.sin(phase / 420) -
			ejectaCharge * 14 +
			ejectaBurst * 30,
	);
	// pinched the OTHER way — wide and flat, longer horizontally
	const SQUEEZE_X = 1.08;
	const SQUEEZE_Y = 0.75;
	// three rings collapsing onto the core while the ejecta launch charges
	const CHARGE_RINGS = performanceProfile.reducedEffects ? [0, 1] : [0, 1, 2];
	const chargeRingProps = (index: number) => {
		const progress = Math.max(0, Math.min(1, ejectaCharge * 1.2 - index * 0.16));
		const spread = 3.2 - progress * 2.05;
		return {
			x: HX,
			y: HY,
			rotation: phase * 0.0016 * (index % 2 === 0 ? 1 : -1),
			width: coreR * spread * SQUEEZE_X,
			height: coreR * spread * SQUEEZE_Y,
			alpha: ejectaCharge * progress * 0.8,
		};
	};
	// video sprite sized so ITS shadow circle matches coreR, positioned so the
	// shadow's center lands exactly on the hole anchor
	const vidW = $derived(coreR / SHADOW_R);
	// anchor 0.5: nudge the sprite so the (slightly off-center) shadow circle
	// inside the art lands exactly on the hole anchor
	const vidX = $derived(HX + (0.5 - SHADOW_CX) * vidW * SQUEEZE_X);
	const vidY = $derived(HY + (0.5 - SHADOW_CY) * vidW * SQUEEZE_Y);
	// slow precession wobble adds parallax life on top of the clip's churn
	const wobble = $derived(0.035 * Math.sin(phase / 2600) + intake * 0.025 * Math.sin(phase / 75));

	// opaque shadow disc under the additive ring (video black is transparent)
	const drawShadow = (g: PIXI.Graphics) => {
		g.ellipse(HX, HY, coreR * SQUEEZE_X * 1.01, coreR * SQUEEZE_Y * 1.01).fill({
			color: 0x02000a,
			alpha: 1,
		});
	};

	// intake sparks: matter streaking off the board edge into the ring
	const MOTES = Array.from({ length: performanceProfile.reducedEffects ? 3 : 7 }, (_, i) => i);
	const moteProps = (i: number, time: number) => {
		const cycle = (((time / ((2400 + i * 300) / (1 + intake * 0.8)) + i * 0.37) % 1) + 1) % 1;
		const x0 = HX - coreR * 3.4;
		const y0 = HY - 90 + (i % 5) * 45;
		const x = x0 + (HX - coreR * 1.15 - x0) * cycle;
		const y = y0 + (HY - y0) * cycle * cycle;
		const size = 3 + (i % 3) * 2 + flare * 2 + intake * 2;
		return {
			x,
			y,
			width: size * (2 + cycle * 3),
			height: size,
			rotation: Math.atan2(HY - y, HX - x),
			alpha: Math.min(0.9, 0.1 + cycle * 0.9 + intake * 0.16),
		};
	};

	const IMPACT_SPARKS = Array.from(
		{ length: performanceProfile.reducedEffects ? 2 : 4 },
		(_, i) => i,
	);
	const impactSparkProps = (impact: AbsorbImpact, index: number) => {
		const angle =
			impact.spin +
			(index / IMPACT_SPARKS.length) * Math.PI * 2 +
			impact.progress * (index % 2 === 0 ? 0.8 : -0.55);
		const radius = coreR * (0.7 + impact.progress * (0.65 + (index % 3) * 0.12));
		const size = (34 - impact.progress * 16) * (0.8 + (index % 3) * 0.14);
		return {
			x: HX + Math.cos(angle) * radius * SQUEEZE_X,
			y: HY + Math.sin(angle) * radius * SQUEEZE_Y,
			rotation: angle,
			width: size,
			height: size,
			alpha: Math.pow(1 - impact.progress, 1.7) * impact.strength * 0.75,
		};
	};
</script>

<BoardContainer>
	{#each MOTES as i (i)}
		<Sprite key="particle_bubble" blendMode="add" anchor={0.5} {...moteProps(i, phase)} />
	{/each}
	{#if intake > 0.01}
		<Sprite
			key="overlay_ripple"
			anchor={0.5}
			blendMode="add"
			tint={0x9eeeff}
			x={HX}
			y={HY}
			rotation={phase * -0.0007}
			width={coreR * (2.15 + intake * 0.22)}
			height={coreR * SQUEEZE_Y * (2.15 + intake * 0.22)}
			alpha={intake * (0.22 + 0.1 * Math.sin(phase / 70))}
		/>
		<Sprite
			key="overlay_ripple"
			anchor={0.5}
			blendMode="add"
			tint={0xb783ff}
			x={HX}
			y={HY}
			rotation={phase * 0.0009}
			width={coreR * (2.48 + intake * 0.3)}
			height={coreR * SQUEEZE_Y * (2.48 + intake * 0.3)}
			alpha={intake * 0.13}
		/>
	{/if}
	<Graphics draw={drawShadow} />
	{#if videoTexture}
		<BaseSprite
			texture={videoTexture}
			blendMode="add"
			anchor={0.5}
			x={vidX}
			y={vidY}
			rotation={wobble}
			width={vidW * SQUEEZE_X}
			height={vidW * SQUEEZE_Y}
			alpha={0.96 + flare * 0.04}
		/>
	{/if}
	<!-- WILD EJECTA launch, at the hole: rings collapse inward while it charges,
	     then a shockwave and a white-gold core flash when it fires. -->
	{#if ejectaCharge > 0.01}
		{#each CHARGE_RINGS as ring (ring)}
			<Sprite
				key="overlay_ripple"
				anchor={0.5}
				blendMode="add"
				tint={ring % 2 === 0 ? 0x9df4ff : 0xffd66f}
				{...chargeRingProps(ring)}
			/>
		{/each}
		<Sprite
			key="particle_bubble"
			anchor={0.5}
			blendMode="add"
			tint={0xffe6a3}
			x={HX}
			y={HY}
			width={coreR * (0.5 + ejectaCharge * 0.55)}
			height={coreR * (0.5 + ejectaCharge * 0.55)}
			alpha={ejectaCharge * 0.85}
		/>
	{/if}
	{#if ejectaBurst > 0.01}
		<Sprite
			key="overlay_ripple"
			anchor={0.5}
			blendMode="add"
			tint={0xfff0c0}
			x={HX}
			y={HY}
			rotation={(1 - ejectaBurst) * 0.9}
			width={coreR * (1.1 + (1 - ejectaBurst) * 2.6) * SQUEEZE_X}
			height={coreR * (1.1 + (1 - ejectaBurst) * 2.6) * SQUEEZE_Y}
			alpha={Math.pow(ejectaBurst, 1.4) * 0.9}
		/>
		<Sprite
			key="particle_bubble"
			anchor={0.5}
			blendMode="add"
			tint={0xffffff}
			x={HX}
			y={HY}
			width={coreR * (0.8 + (1 - ejectaBurst) * 1.3)}
			height={coreR * (0.8 + (1 - ejectaBurst) * 1.3)}
			alpha={Math.pow(ejectaBurst, 2) * 0.95}
		/>
	{/if}
	{#each impacts as impact (impact.id)}
		<Sprite
			key="overlay_ripple"
			anchor={0.5}
			blendMode="add"
			tint={impact.id % 2 === 0 ? 0x9eeeff : 0xffc465}
			x={HX}
			y={HY}
			rotation={impact.spin + impact.progress * 0.8}
			width={coreR * (1.3 + impact.progress * 1.45)}
			height={coreR * SQUEEZE_Y * (1.3 + impact.progress * 1.45)}
			alpha={Math.pow(1 - impact.progress, 1.5) * impact.strength * 0.62}
		/>
		<Sprite
			key="particle_bubble"
			anchor={0.5}
			blendMode="add"
			tint={0xffe6a3}
			x={HX}
			y={HY}
			width={coreR * (0.42 + impact.progress * 0.9)}
			height={coreR * (0.42 + impact.progress * 0.9)}
			alpha={Math.pow(1 - impact.progress, 2.2) * impact.strength * 0.75}
		/>
		{#each IMPACT_SPARKS as spark (spark)}
			<Sprite
				key="particle_gold_fleck"
				anchor={0.5}
				blendMode="add"
				tint={spark % 3 === 0 ? 0x9eeeff : 0xffc465}
				{...impactSparkProps(impact, spark)}
			/>
		{/each}
	{/each}
	<!-- gravity multiplier readout — always mounted; empty text hides it
	     (live text updates on BitmapText verified; keep the instance stable) -->
	<!-- owner: the multiplier reads badly ON the hole (it fights the core video and
	     the collapsing rings), so it sits to its RIGHT. Clamped against the stage
	     edge in board coords, because at desktop the hole is already close to it
	     and an unclamped offset would push the readout off-screen. -->
	<BitmapText
		text={gravityMult > 1 ? `x${gravityMult}` : ''}
		anchor={0.5}
		x={multX}
		y={multY}
		style={{ fontFamily: 'gold', fontSize: MULT_FONT }}
	/>
</BoardContainer>
