<script lang="ts" module>
	// clips Poseidon can play; omit `clip` to rotate through the three attacks
	export type EmitterEventMascot =
		| { type: 'mascotReact'; clip?: 'slam' | 'smash' | 'beam' | 'tideraise' }
		| { type: 'catSnapPlay'; amount: number };
</script>

<script lang="ts">
	// Poseidon mascot — ONE DOM <img> of transparent animated WebP clips (Seedance
	// 2.0 → magenta-keyed, 540x720). All clips share ONE canvas so he never shrinks/shifts.
	// He is positioned by ANCHORING to the board's real on-screen rect (computed from
	// the same layout math the pixi board uses), so on every screen size/orientation his
	// feet sit just above the board frame (stacked) or in the side gutter (wide) and
	// never overlap the board or the HUD.
	import { onMount, tick } from 'svelte';

	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { stateUi } from 'state-shared';

	import { getContext } from '../game/context';
	import { SFX } from '../game/soundMap';
	import {
		BOARD_SIZES,
		SYMBOL_SIZE,
		PORTRAIT_BOARD_DROP,
		FRAME_SIZES,
		frameVortexScreenPoint,
	} from '../game/constants';
	import { performanceProfile } from '../game/performance.svelte';
	import { holeState } from '../game/blackHole.svelte';
	import { sceneLightPulse } from '../game/light.svelte';

	const context = getContext();
	const L = context.stateLayoutDerived;

	const ATTACKS = ['slam', 'smash', 'beam'] as const;
	const ATTACK_MS = 5200; // real action clips are 5041ms (121f @ ~24fps); 5200 snaps back
	// to idle ~160ms into the seamless loop restart (verified clean, no hitch)
	const V = 13; // v13 restores the full-resolution idle on every device.
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
	// The historical attack filenames are byte-identical copies of idle.webp.
	// Keep reaction timing/sound behavior, but never request those duplicate 12 MB.
	const clipSrc = () => `${A}sprites/poseidon/idle.webp?v=${V}`;

	// --- board-anchored placement -------------------------------------------------
	// BoardFrame.svelte draws the frame sprite at boardLayout()*1.01, sized
	// boardLayout().width(560) * 1.26, height = width * 719/694. mainLayout is
	// contain-scaled (scale = min(W/mainW, H/mainH)) and centred in the canvas, so a
	// main-space point maps to screen px as: H/2 + scale*(y_main - mainH/2).
	const FRAME_W = FRAME_SIZES.width;
	const FRAME_H = FRAME_SIZES.height;
	const POS = 1.01; // BoardFrame POSITION_ADJUSTMENT
	const FEET = 895 / 1112; // feet line (0.805) within the 834x1112 canvas — measured from the
	// real idle silhouette's alpha bbox (feet barely move across the hover loop)
	const HEAD = 463 / 1112; // crown/top line (0.416) within the canvas — idle silhouette top
	const AR = 540 / 720; // element width / height (0.75, == 834/1112 — unchanged)
	const MOBILE_STACKED_SCALE = 1.75;
	// Union alpha bounds across all 61 idle frames (threshold > 8). Keep these
	// shared by placement and CSS: the wide zoom pivots from the board-side alpha
	// edge, so enlargement grows toward the left/off-screen rather than the reels.
	const WIDE_CHAR_L = 229 / 834;
	const WIDE_CHAR_R = 614 / 834;
	// The two body points, as fractions of the 834x1112 clip canvas. These four
	// numbers are the ONLY definition of "his boot" and "his harness": the
	// placement math below reads them, and they are published as CSS custom
	// properties so every transform-origin and the .tether-anchor the rope reads
	// resolve to the same pixels. Never restate them as a literal percentage.
	const MOBILE_FOOT_X = 365 / 834; // boot center (silhouette is 0.428..0.468 wide there)
	const TETHER_HARNESS_X = 0.52; // harness clip on his torso
	const TETHER_HARNESS_Y = 0.6;

	const place = $derived.by(() => {
		const cs = L.canvasSizes();
		const ml = L.mainLayout();
		// THE shared anchor: the pixi crown vortex, this boot, and the rope's fixed
		// end are the same screen point, derived once in constants.ts.
		const vortex = frameVortexScreenPoint(L);
		const W = cs.width;
		const H = cs.height;
		const s = ml.scale;
		const mW = ml.width;
		const mH = ml.height;
		// board frame edges in screen px. Read ml.x/ml.y, NOT W/2 and H/2 — the
		// solver lifts the board off centre to reserve the HUD band.
		const frameTopY = ml.y + s * ((mH / 2) * POS - FRAME_H / 2 - mH / 2);
		const frameLeftX = ml.x + s * ((mW / 2) * POS - FRAME_W / 2 - mW / 2);
		const symbolTopY = ml.y - (BOARD_SIZES.height / 2) * s; // top of the 7x7 symbol grid

		let elH: number;
		let elTop: number;
		let left: string;
		let tx = 'none';

		if (L.isStacked()) {
			// portrait / mobile: Poseidon stands ON the board — BIG, feet overlapping the
			// top rows so he reads as rising out of the water on top of the grid, with his
			// WHOLE figure (trident tip → feet) kept in frame (tip at the very top edge).
			const topInset = H * 0.02;
			// owner 2026-07-28: he was covering row 1 — feet sit ON the top rail,
			// whole body above the board
			const baseFeet = frameTopY + 10;
			const feetTarget = baseFeet;
			// 1.14× — 20% taller (user-tuned) while the FEET anchor below keeps his
			// feet planted on the board top; the old 1.5× overshoot cropped the head
			elH = ((baseFeet - topInset) / FEET) * 1.14;
			const maxW = W * 1.04;
			if (elH * AR > maxW) elH = maxW / AR; // narrow phones: width-limit
			elTop = feetTarget - FEET * elH;
			// FINAL user-requested scale/offset — applied AFTER the existing clamps above,
			// which already ran on the "old" size: 1.9× taller (2× shrunk 5% across the
			// board, owner 2026-07-27), feet re-anchored from the scaled height (same
			// feet-anchor formula), then nudged 20px further down.
			// owner 2026-07-28 FINAL: the cat's ENTIRE canvas sits ABOVE the top
			// rail — bottom-anchored to it, so no part of the art (trailing leg,
			// shadow, anything) can ever overlap the reels, at any width.
			const railY = frameTopY + 4;
			const skyH = railY - 4; // space between screen top and the rail
			// owner: 2x bigger — fill the ENTIRE sky; the rail anchor still
			// guarantees he can never cover the reels
			elH = Math.min(elH * 3.8, skyH / 0.97, (W * 1.3) / AR);
			elH = elH * MOBILE_STACKED_SCALE;
			// Pin the forward boot ON the shared vortex anchor in BOTH axes, so small
			// phones lower the cat into available space instead of cropping its
			// helmet and the boot / rope end / vortex center can never drift apart.
			// `left` is the anchor itself; the translateX below backs the element out
			// by the boot's own fraction of the clip canvas, which is the same
			// fraction the .stacked transform-origin pivots on.
			const inFs = context.stateGame.gameType === 'freegame';
			if (inFs) elH = elH * 0.82;
			elTop = vortex.y - FEET * elH;
			left = `${vortex.x}px`;
			tx = `translateX(-${MOBILE_FOOT_X * 100}%)`;
		} else {
			// desktop / landscape: BIG, anchored bottom-left with his BODY at the left edge.
			// Sized by viewport HEIGHT (like the original) so it scales gradually and never
			// collapses into a tiny gutter sprite when you resize. His body stays clear of the
			// board frame (only the transparent margin runs off-screen); a floor keeps him big.
			const leftInset = W * 0.01;
			const feetMaxY = H * 0.72; // feet clear of the bottom HUD / balance
			// Union alpha bounds across all 61 idle frames (threshold > 8), not a single
			// representative frame. The former 240..601 estimate missed the paw/tail
			// extremes at 229..614, so its "clear" placement could still cover the first
			// reel in Popout S.
			elH = H * 0.7; // big, height-driven — sized so the whole figure
			// (scythe tip included) fits on screen on desktop
			const clearW =
				(frameLeftX - leftInset) / ((WIDE_CHAR_R - WIDE_CHAR_L) * AR); // char-right ≤ board left
			const fitTop = (feetMaxY - H * 0.02) / FEET; // canvas top stays on-screen
			elH = Math.min(elH, clearW, fitTop);
			elH = Math.max(elH, W < 500 ? H * 0.38 : H * 0.5); // floor — never tiny; lower on very narrow so he can't cover the board
			// user-requested scale — applied AFTER the existing clamps above, which already
			// ran on the "old" size. 2.019× = the 2.125× tune shrunk 5% (owner 2026-07-27).
			elH = elH * 2.019;
			// 5x4 redesign: the frame is much wider, the left gutter narrower — after
			// the scale multiplier, re-clamp so the cat's BODY never runs off-screen
			// or under the frame (the transparent canvas margin may still bleed).
			const gutterFit =
				(frameLeftX - leftInset) / ((WIDE_CHAR_R - WIDE_CHAR_L) * AR);
			// narrow landscape/popouts get NO grace — the body must fit the gutter
			const grace = W < 1280 ? 1.0 : 1.12;
			elH = Math.min(elH, gutterFit * grace);
			// owner 2026-07-27: sit him 20px lower on desktop (mobile placement untouched)
			elTop = feetMaxY - FEET * elH + 20; // feet-anchor recomputed from the scaled elH
			// sit him in the left gutter with his BODY clear of the board frame: place the
			// canvas so his silhouette's right edge (CHAR_R) lands GAP px left of the frame.
			// Let the transparent margin and, where necessary, part of the body run off the
			// left edge: playfield clearance has priority over keeping the whole cat on-screen.
			const GAP = W < 640 || H < 360 ? 16 : 12;
			const clearLeft = frameLeftX - GAP - WIDE_CHAR_R * AR * elH;
			left = `${clearLeft}px`;
		}

		const feetY = elTop + FEET * elH;
		return {
			elH,
			elTop,
			left,
			tx,
			frameTopY,
			frameLeftX,
			symbolTopY,
			feetY,
			vortex, // stacked invariant: feetY === vortex.y and the boot x === vortex.x
			W,
			H,
			stacked: L.isStacked(),
		};
	});

	const sceneLight = $derived(sceneLightPulse());
	const mascotStyle = $derived(
		`left:${place.left}; top:${place.elTop}px; height:${place.elH}px; transform:${place.tx}; --foot-x:${MOBILE_FOOT_X * 100}%; --foot-y:${FEET * 100}%; --foot-translate-x:-${MOBILE_FOOT_X * 100}%; --harness-x:${TETHER_HARNESS_X * 100}%; --harness-y:${TETHER_HARNESS_Y * 100}%; --wide-origin-x:${WIDE_CHAR_R * 100}%; --scene-light:${sceneLight.toFixed(3)};`,
	);

	// expose computed geometry for off-screen verification harnesses
	$effect(() => {
		(globalThis as unknown as { __MASCOT_DBG__?: unknown }).__MASCOT_DBG__ = place;
	});

	let clip = $state('idle');
	let count = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let swooshTimer: ReturnType<typeof setTimeout> | undefined;

	// react = play an attack. `forced` targets a specific clip (used to map
	// flood→slam / cascade→beam / scatter→smash); otherwise rotate the attacks.
	// per-clip Hades vocalisation: scythe slam → grunt, soul absorb → growl,
	// soul beam → roar, victory aura → triumphant laugh
	let lastVocalAt = 0;
	const CLIP_VOICE = {
		slam: SFX.hadesGrunt,
		smash: SFX.hadesGrowl,
		beam: SFX.hadesRoar,
		tideraise: SFX.hadesLaugh,
	} as const;
	let voiceTimer: ReturnType<typeof setTimeout> | undefined;

	const react = (forced?: 'slam' | 'smash' | 'beam' | 'tideraise') => {
		clip = forced ?? ATTACKS[count % ATTACKS.length];
		if (!forced) count += 1;
		// trident swoosh, slightly delayed to land on the actual swing
		clearTimeout(swooshTimer);
		swooshTimer = setTimeout(
			() =>
				context.eventEmitter.broadcast({
					type: 'soundOnce',
					name: SFX.tridentSwoosh,
					forcePlay: true,
				}),
			220,
		);
		// he grunts/roars WITH the animation (owner 2026-07-27) — ~400ms in, on the
		// clip's action peak, just after the swoosh
		// owner: 'too much meowing' — vocalize on ~30% of reacts, never twice
		// within 14s
		const now = Date.now();
		const vocalOk = Math.random() < 0.3 && now - lastVocalAt > 14000;
		if (vocalOk) lastVocalAt = now;
		const voice = vocalOk ? CLIP_VOICE[clip as keyof typeof CLIP_VOICE] : undefined;
		clearTimeout(voiceTimer);
		if (voice) {
			voiceTimer = setTimeout(
				() => context.eventEmitter.broadcast({ type: 'soundOnce', name: voice, forcePlay: true }),
				400,
			);
		}
		clearTimeout(timer);
		timer = setTimeout(() => (clip = 'idle'), ATTACK_MS);
	};

	// the bonus splash clip IS Hades — he must be off-screen for every frame of it or
	// there are two of him. Hidden instantly (no fade) the moment the clip starts.
	let waveHidden = $state(false);

	// CAT RESCUE: only a server-authored catSnap book event starts this sequence.
	// The full mascot body follows the actual layout-derived black-hole position,
	// then reverses the same route and reconnects the tether before settling.
	type SnapFxPhase = 'none' | 'capture' | 'infall' | 'impact' | 'return' | 'settle';
	let snapActive = $state(false);
	let snapFxPhase = $state<SnapFxPhase>('none');
	let snapPrize = $state('');
	let snapTrailStyle = $state('');
	let snapImpactStyle = $state('');
	let mascotBodyEl: HTMLDivElement;
	let afterimageAEl: HTMLImageElement;
	let afterimageBEl: HTMLImageElement;
	let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	const activeSnapAnimations = new Set<Animation>();
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
	const waitForAnimation = async (animation: Animation) => {
		try {
			await animation.finished;
		} catch {
			// Component teardown or a defensive reset cancels active Web Animations.
		}
	};
	const startSnapAnimation = (
		element: Element,
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
	) => {
		const animation = element.animate(keyframes, { fill: 'forwards', ...options });
		activeSnapAnimations.add(animation);
		animation.finished.catch(() => {});
		return animation;
	};
	const cancelSnapAnimations = () => {
		for (const animation of activeSnapAnimations) animation.cancel();
		activeSnapAnimations.clear();
	};
	const holeScreenPoint = () => {
		const ml = L.mainLayout();
		return {
			x: ml.x + ml.scale * (holeState.x - BOARD_SIZES.width / 2),
			y:
				ml.y +
				(L.isStacked() ? PORTRAIT_BOARD_DROP : 0) +
				ml.scale * (holeState.y - BOARD_SIZES.height / 2),
		};
	};
	const routeFrames = (dx: number, dy: number) => {
		const distance = Math.max(1, Math.hypot(dx, dy));
		const normalX = -dy / distance;
		const normalY = dx / distance;
		const arc = Math.min(150, distance * 0.15) * (place.stacked ? -1 : 1);
		const pathAxis = (Math.atan2(dy, dx) * 180) / Math.PI - 90;
		const routeTransform = (progress: number, scaleX: number, scaleY: number, rotation: number) => {
			const bow = Math.sin(progress * Math.PI) * arc;
			const x = dx * progress + normalX * bow;
			const y = dy * progress + normalY * bow;
			// Rotate the anisotropic scale into the pull vector, then rotate it back.
			// This stretches the silhouette toward the hole without turning the cat
			// fully sideways for most of the flight.
			return `translate3d(${x}px, ${y}px, 0) rotate(${pathAxis + rotation}deg) scaleX(${scaleX}) scaleY(${scaleY}) rotate(${-pathAxis}deg)`;
		};
		const turn = (place.stacked ? -1 : 1) * 13;
		const capture: Keyframe[] = [
			{ transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', opacity: 1 },
			{ transform: routeTransform(0, 0.68, 1.5, 1.5), opacity: 1 },
		];
		const infall: Keyframe[] = [
			{ offset: 0, transform: routeTransform(0, 0.68, 1.5, 1.5), opacity: 1 },
			{ offset: 0.22, transform: routeTransform(0.2, 0.42, 1.95, turn * 0.25), opacity: 1 },
			{ offset: 0.52, transform: routeTransform(0.52, 0.14, 2.55, turn * 0.58), opacity: 0.94 },
			{ offset: 0.8, transform: routeTransform(0.83, 0.035, 2.2, turn * 0.9), opacity: 0.7 },
			{ offset: 1, transform: routeTransform(1, 0.008, 0.1, turn), opacity: 0 },
		];
		const eject: Keyframe[] = [
			{ offset: 0, transform: routeTransform(1, 0.008, 0.1, turn), opacity: 0 },
			{ offset: 0.16, transform: routeTransform(0.86, 0.035, 2.2, turn * 0.9), opacity: 0.72 },
			{ offset: 0.48, transform: routeTransform(0.5, 0.16, 2.5, turn * 0.55), opacity: 0.96 },
			{ offset: 0.8, transform: routeTransform(0.12, 0.72, 1.5, turn * 0.18), opacity: 1 },
			{ offset: 1, transform: routeTransform(0, 1.04, 0.97, -2), opacity: 1 },
		];
		return { capture, infall, eject, distance };
	};
	const playCatSnap = async (amount: number) => {
		if (snapActive) return;
		try {
			snapActive = true;
			snapFxPhase = 'capture';
			await tick();
			if (!mascotBodyEl) return;

			const anchor = mascotBodyEl.querySelector('.tether-anchor')?.getBoundingClientRect();
			if (!anchor) return;
			const start = { x: anchor.left + anchor.width / 2, y: anchor.top + anchor.height / 2 };
			const target = holeScreenPoint();
			const screenDx = target.x - start.x;
			const screenDy = target.y - start.y;
			const angle = Math.atan2(screenDy, screenDx);
			const screenDistance = Math.max(1, Math.hypot(screenDx, screenDy));
			const outerTransform = getComputedStyle(mascotBodyEl.parentElement!).transform;
			const matrix = new DOMMatrixReadOnly(outerTransform === 'none' ? undefined : outerTransform);
			const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
			const localDx =
				determinant === 0 ? screenDx : (matrix.d * screenDx - matrix.c * screenDy) / determinant;
			const localDy =
				determinant === 0 ? screenDy : (-matrix.b * screenDx + matrix.a * screenDy) / determinant;
			const route = routeFrames(localDx, localDy);
			snapTrailStyle = `left:${start.x}px;top:${start.y}px;width:${screenDistance}px;transform:translateY(-50%) rotate(${angle}rad);`;
			snapImpactStyle = `left:${target.x}px;top:${target.y}px;`;

			context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.wildExplode });
			const capture = startSnapAnimation(mascotBodyEl, route.capture, {
				duration: 170,
				easing: 'cubic-bezier(0.5, 0, 0.75, 0.4)',
			});
			await waitForAnimation(capture);

			snapFxPhase = 'infall';
			const flightDuration = performanceProfile.reducedEffects ? 520 : 760;
			const infall = startSnapAnimation(mascotBodyEl, route.infall, {
				duration: flightDuration,
				easing: 'cubic-bezier(0.6, -0.05, 0.9, 0.4)',
			});
			if (!performanceProfile.reducedEffects) {
				const ghosts = [afterimageAEl, afterimageBEl].filter(Boolean);
				for (const [index, ghost] of ghosts.entries()) {
					const ghostFrames = route.infall.map((frame, frameIndex) => ({
						...frame,
						opacity:
							frameIndex === 0 || frameIndex === route.infall.length - 1 ? 0 : 0.2 - index * 0.055,
					}));
					startSnapAnimation(ghost, ghostFrames, {
						duration: flightDuration,
						delay: 40 + index * 55,
						easing: 'cubic-bezier(0.6, -0.05, 0.9, 0.4)',
					});
				}
			}
			await waitForAnimation(infall);

			snapFxPhase = 'impact';
			context.eventEmitter.broadcast({ type: 'blackHoleAbsorb', strength: 1.25 });
			await sleep(performanceProfile.reducedEffects ? 230 : 420);

			snapFxPhase = 'return';
			context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.scatterWin });
			context.eventEmitter.broadcast({ type: 'blackHoleEject', strength: 1.1 });
			// amount is a BOOK amount in bet-cents — scale by the wagered stake like
			// every other win display, never a bare /100 (wrong at any stake != 1.00)
			snapPrize = `+${bookEventAmountToCurrencyString(amount)}`;
			const ejectDuration = performanceProfile.reducedEffects ? 580 : 860;
			clearTimeout(reconnectTimer);
			reconnectTimer = setTimeout(
				() => context.eventEmitter.broadcast({ type: 'mascotTetherReconnect' }),
				Math.round(ejectDuration * 0.68),
			);
			const eject = startSnapAnimation(mascotBodyEl, route.eject, {
				duration: ejectDuration,
				easing: 'cubic-bezier(0.16, 0.75, 0.24, 1)',
			});
			await waitForAnimation(eject);

			snapFxPhase = 'settle';
			const settle = startSnapAnimation(
				mascotBodyEl,
				[
					{ transform: 'translate3d(0,0,0) rotate(-2deg) scaleX(1.04) scaleY(0.97)' },
					{
						offset: 0.55,
						transform: 'translate3d(0,-4px,0) rotate(0.8deg) scaleX(0.985) scaleY(1.035)',
					},
					{ transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' },
				],
				{ duration: 360, easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.35)' },
			);
			await waitForAnimation(settle);
			await sleep(420);
		} finally {
			clearTimeout(reconnectTimer);
			cancelSnapAnimations();
			snapPrize = '';
			snapTrailStyle = '';
			snapImpactStyle = '';
			snapFxPhase = 'none';
			snapActive = false;
			context.eventEmitter.broadcast({ type: 'mascotTetherReset' });
		}
	};

	context.eventEmitter.subscribeOnMount({
		// fired from the reveal handler the instant we know the spin won, so he's
		// already mid-swing as the reels pay out (not late, on winShow).
		mascotReact: (emitterEvent) => react(emitterEvent.clip),
		bonusWave: () => (waveHidden = true),
		bonusWaveEnd: () => (waveHidden = false),
		// NO tumbleBoardExplode handler: ordinary cascades must not move the cat or
		// his tether. It read as an incomplete suction attempt, and the yank drove
		// the art and the .tether-anchor through two different transforms, so the
		// rope end floated off his harness for the whole 650ms snap-back. He travels
		// toward the hole ONLY in the server-authored Cat Rescue sequence below.
		catSnapPlay: async (e) => playCatSnap(e.amount),
	});

	onMount(() => {
		// Clear pending reaction timers on unmount.
		return () => {
			clearTimeout(timer);
			clearTimeout(swooshTimer);
			clearTimeout(voiceTimer);
			clearTimeout(reconnectTimer);
			cancelSnapAnimations();
		};
	});
</script>

<!-- the hamburger menu draws in the CANVAS (below this DOM overlay), so the
     mascot fades out while the menu is open or its options render behind him -->
<div
	class="poseidon-mascot"
	class:menu-open={stateUi.menuOpen}
	class:wave-hidden={waveHidden}
	class:snap-active={snapActive}
	class:stacked={place.stacked}
	class:idle={clip === 'idle'}
	class:reduced-effects={performanceProfile.reducedEffects}
	aria-hidden="true"
	style={mascotStyle}
>
	{#if snapActive && !performanceProfile.reducedEffects}
		<img bind:this={afterimageAEl} class="snap-afterimage ghost-a" src={clipSrc()} alt="" />
		<img bind:this={afterimageBEl} class="snap-afterimage ghost-b" src={clipSrc()} alt="" />
	{/if}
	<div class="mascot-body" bind:this={mascotBodyEl}>
		<div class="glow"></div>
		<div class="shadow"></div>
		<div class="visor-light" aria-hidden="true"></div>
		<div class="helmet-ring-light" aria-hidden="true"></div>
		<div class="chest-ring-light" aria-hidden="true"></div>
		<div class="metal-glint helmet-left" aria-hidden="true"></div>
		<div class="metal-glint helmet-right" aria-hidden="true"></div>
		<div class="metal-glint chest" aria-hidden="true"></div>
		<div class="metal-glint shoulder" aria-hidden="true"></div>
		<div class="metal-glint wrist" aria-hidden="true"></div>
		<div class="metal-glint knee" aria-hidden="true"></div>
		<div class="metal-glint boot" aria-hidden="true"></div>
		<div class="tether-anchor" aria-hidden="true"></div>
		<!-- ambient wind: soft wisp streaks looping around him at all times -->
		<div class="wind" aria-hidden="true">
			<span class="wisp w1"></span>
			<span class="wisp w2"></span>
			<span class="wisp w3"></span>
		</div>
		{#if !place.stacked}
			<!-- molten reflection in the lava sea below him (wide layouts only — in portrait
		     he hovers over the BOARD, where a reflection would paint onto the symbols).
		     Same clip flipped, orange-graded, blurred, slow wobble; masked to a fading
		     band starting at his feet line. -->
			<img class="reflection" src={clipSrc()} alt="" />
			<!-- lava bounce-light on his lower body -->
			<div class="underglow" aria-hidden="true"></div>
		{/if}
		<img class="frame" src={clipSrc()} alt="" />
		{#if snapPrize}
			<div class="snap-prize">{snapPrize}</div>
		{/if}
	</div>
</div>

{#if snapActive && snapTrailStyle && ['infall', 'impact', 'return'].includes(snapFxPhase)}
	<div
		class="mascot-suction-trail"
		class:returning={snapFxPhase === 'return'}
		style={snapTrailStyle}
		aria-hidden="true"
	></div>
{/if}
{#if snapImpactStyle && (snapFxPhase === 'impact' || snapFxPhase === 'return')}
	<div
		class="mascot-hole-impact"
		class:ejecting={snapFxPhase === 'return'}
		style={snapImpactStyle}
		aria-hidden="true"
	></div>
{/if}

<style>
	.poseidon-mascot {
		position: fixed;
		z-index: 6;
		pointer-events: none;
		display: flex;
		align-items: flex-end;
		transition: opacity 0.18s ease;
		/* Keep the camera-depth zoom, but pivot it from the silhouette's board-side
		   alpha edge. The 18% growth therefore expands left/off-screen; the negative
		   drift adds clearance instead of carrying him toward the first reel. */
		transform-origin: var(--wide-origin-x) var(--harness-y);
		animation: mascot-depth-wide 20s cubic-bezier(0.45, 0, 0.2, 1) infinite;
		will-change: transform;
	}
	.poseidon-mascot.snap-active {
		animation-play-state: paused;
	}
	.mascot-body {
		position: relative;
		display: flex;
		align-items: flex-end;
		height: 100%;
		transform-origin: var(--harness-x) var(--harness-y);
		will-change: transform, opacity;
	}
	.poseidon-mascot.stacked {
		animation-name: mascot-depth-stacked;
		transform-origin: var(--foot-x) var(--foot-y);
	}
	@keyframes mascot-depth-wide {
		0%,
		9%,
		100% {
			transform: none;
		}
		54%,
		65% {
			transform: translate3d(-1.35vw, 0.8vh, 0) scale(1.18) rotate(-0.6deg);
		}
		74% {
			transform: translate3d(-0.75vw, 0.4vh, 0) scale(1.12) rotate(-0.25deg);
		}
	}
	@keyframes mascot-depth-stacked {
		0%,
		9%,
		100% {
			transform: translateX(var(--foot-translate-x)) scale(1);
		}
		54%,
		65% {
			transform: translateX(var(--foot-translate-x)) scale(1.36) rotate(-0.7deg);
		}
		74% {
			transform: translateX(var(--foot-translate-x)) scale(1.22) rotate(-0.3deg);
		}
	}
	/* owner 2026-08-07: the cat STAYS VISIBLE with the menu open. It used to fade
	   to 0 here; the menu is a small bottom-left popover and does not need the
	   whole mascot to get out of its way. */
	/* the splash clip is Hades himself — cut, don't fade, so the two never overlap */
	.poseidon-mascot.wave-hidden {
		opacity: 0;
		visibility: hidden;
		transition: none;
	}
	/* The rope reads this live harness point — it carries NO transform of its own,
	   so its rect is always exactly the harness fraction of the live mascot box.
	   The boot is pinned to the same shared frame-vortex anchor by the placement
	   math above (stacked: left = vortex.x, elTop = vortex.y - FEET * elH). */
	.tether-anchor {
		position: absolute;
		left: var(--harness-x);
		top: var(--harness-y);
		width: 1px;
		height: 1px;
		z-index: 0;
	}
	/* magenta-ember glow halo behind him — a soft rim/aura so he lifts off the lava */
	.glow {
		position: absolute;
		left: -30%;
		right: -30%;
		top: -4%;
		bottom: -2%;
		z-index: 0;
		pointer-events: none;
		background: radial-gradient(
			52% 54% at 50% 50%,
			rgba(124, 104, 255, 0.55) 0%,
			rgba(80, 180, 255, 0.3) 40%,
			rgba(90, 64, 216, 0) 72%
		);
		filter: blur(18px);
	}
	/* molten REFLECTION: flipped copy of the live clip, feet-to-feet ((2×FEET−1)=61%),
	   orange-graded via GPU colour filters, masked to a band that fades out ~25% down.
	   The flipped feet sit at (1−FEET)≈19.5% of the flipped image. */
	.reflection {
		position: absolute;
		z-index: 0;
		top: 61%;
		left: 0;
		height: 100%;
		width: auto;
		opacity: 0.3;
		filter: blur(4px) sepia(1) saturate(3) hue-rotate(200deg) brightness(0.8);
		-webkit-mask-image: linear-gradient(
			to bottom,
			transparent 16%,
			rgba(0, 0, 0, 0.85) 20%,
			transparent 46%
		);
		mask-image: linear-gradient(
			to bottom,
			transparent 16%,
			rgba(0, 0, 0, 0.85) 20%,
			transparent 46%
		);
		transform: scaleY(-1);
		animation: refl-wobble 4.2s ease-in-out infinite alternate;
		pointer-events: none;
	}
	@keyframes refl-wobble {
		from {
			transform: scaleY(-1) scaleX(1);
		}
		to {
			transform: scaleY(-1.05) scaleX(1.02);
		}
	}

	/* lava UPLIGHT on his lower body — warm bounce light breathing softly */
	.underglow {
		position: absolute;
		left: 4%;
		right: 4%;
		bottom: -3%;
		height: 36%;
		z-index: 2;
		pointer-events: none;
		background: radial-gradient(
			52% 62% at 50% 100%,
			rgba(110, 120, 255, 0.42),
			rgba(110, 120, 255, 0) 72%
		);
		mix-blend-mode: screen;
		filter: blur(10px);
		animation: uplight-breathe 3.4s ease-in-out infinite alternate;
	}
	@keyframes uplight-breathe {
		from {
			opacity: 0.75;
		}
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reflection,
		.underglow {
			animation: none;
		}
	}

	/* ambient WIND: three soft streaks orbiting him on staggered loops — pale
	   ash-warm, screen-blended, blurred, always on. Cheap: transform/opacity only. */
	.wind {
		position: absolute;
		inset: -6% -18%;
		z-index: 2; /* over the body, under nothing else — wisps read as passing in front */
		pointer-events: none;
		overflow: hidden;
	}
	.wisp {
		position: absolute;
		left: -30%;
		width: 68%;
		height: 5.5%;
		border-radius: 50%;
		background: linear-gradient(
			90deg,
			rgba(190, 214, 255, 0) 0%,
			rgba(190, 214, 255, 0.5) 35%,
			rgba(150, 170, 255, 0.32) 65%,
			rgba(190, 214, 255, 0) 100%
		);
		filter: blur(7px);
		mix-blend-mode: screen;
		opacity: 0;
		animation: wisp-pass 9s linear infinite;
	}
	.wisp.w1 {
		top: 24%;
		animation-duration: 8s;
	}
	.wisp.w2 {
		top: 47%;
		animation-duration: 11s;
		animation-delay: -4s;
		height: 4%;
	}
	.wisp.w3 {
		top: 68%;
		animation-duration: 9.5s;
		animation-delay: -7s;
		height: 4.5%;
	}
	@keyframes wisp-pass {
		0% {
			transform: translateX(0) rotate(-6deg);
			opacity: 0;
		}
		12% {
			opacity: 1;
		}
		55% {
			opacity: 0.85;
		}
		78% {
			opacity: 0;
		}
		100% {
			transform: translateX(210%) rotate(4deg);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.wisp {
			animation: none;
			opacity: 0;
		}
	}

	/* soft elliptical contact shadow so he reads as planted, not pasted-on */
	.shadow {
		position: absolute;
		left: 50%;
		bottom: 4.2%;
		width: 34%;
		height: 4.5%;
		transform: translateX(-50%);
		z-index: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse at center,
			rgba(8, 26, 52, 0.55) 0%,
			rgba(8, 26, 52, 0.3) 45%,
			rgba(8, 26, 52, 0) 75%
		);
		filter: blur(3px);
	}

	/* Material-local idle lighting. Glass and metal follow the same scene-level
	   pulse as the symbols and screen illumination. */
	.visor-light {
		position: absolute;
		left: 39.2%;
		top: 33.2%;
		width: 26.7%;
		height: 17.2%;
		z-index: 3;
		border-radius: 50%;
		pointer-events: none;
		mix-blend-mode: screen;
		background:
			radial-gradient(circle at 24% 20%, rgba(255, 255, 255, 0.82) 0 2%, transparent 12%),
			linear-gradient(
				112deg,
				rgba(110, 205, 255, 0.1) 24%,
				rgba(205, 242, 255, 0.18) 36%,
				rgba(255, 255, 255, 0.78) 46%,
				rgba(106, 194, 255, 0.22) 54%,
				rgba(110, 205, 255, 0.08) 70%
			);
		background-size:
			100% 100%,
			280% 100%;
		box-shadow:
			inset 6px 5px 12px rgba(220, 248, 255, 0.32),
			inset -8px -6px 16px rgba(55, 145, 255, 0.32),
			0 0 15px rgba(128, 218, 255, calc(0.18 + var(--scene-light) * 0.32));
		filter: brightness(calc(0.88 + var(--scene-light) * 0.42));
		animation: visor-scan 5.8s ease-in-out infinite;
	}
	@keyframes visor-scan {
		0%,
		18% {
			background-position:
				0 0,
				120% 0;
			opacity: calc(0.18 + var(--scene-light) * 0.14);
		}
		45%,
		61% {
			background-position:
				0 0,
				48% 0;
			opacity: calc(0.58 + var(--scene-light) * 0.3);
		}
		82%,
		100% {
			background-position:
				0 0,
				-30% 0;
			opacity: calc(0.16 + var(--scene-light) * 0.12);
		}
	}
	.helmet-ring-light,
	.chest-ring-light {
		position: absolute;
		z-index: 4;
		border-radius: 50%;
		pointer-events: none;
		mix-blend-mode: screen;
		background: conic-gradient(
			from 20deg,
			transparent 0 18%,
			rgba(150, 225, 255, 0.2) 26%,
			rgba(255, 250, 215, 0.92) 32%,
			transparent 42% 67%,
			rgba(255, 180, 72, 0.7) 75%,
			transparent 84% 100%
		);
		-webkit-mask: radial-gradient(closest-side, transparent 74%, #000 78% 88%, transparent 93%);
		mask: radial-gradient(closest-side, transparent 74%, #000 78% 88%, transparent 93%);
		opacity: calc(0.28 + var(--scene-light) * 0.54);
		filter: drop-shadow(0 0 5px rgba(255, 222, 145, 0.52));
		animation: material-ring-turn 5.2s linear infinite;
	}
	.helmet-ring-light {
		left: 37.1%;
		top: 29.7%;
		width: 31%;
		aspect-ratio: 1;
	}
	.chest-ring-light {
		left: 40.1%;
		top: 48.1%;
		width: 12%;
		aspect-ratio: 1;
		animation-duration: 3.9s;
		animation-direction: reverse;
	}
	@keyframes material-ring-turn {
		to {
			transform: rotate(360deg);
		}
	}
	.metal-glint {
		position: absolute;
		z-index: 4;
		width: 2.2%;
		aspect-ratio: 1;
		border-radius: 50%;
		pointer-events: none;
		background: #fff7d6;
		box-shadow: 0 0 10px 4px rgba(255, 193, 88, 0.62);
		mix-blend-mode: screen;
		opacity: 0;
		animation: metal-pop 7.8s ease-in-out infinite;
	}
	.metal-glint::before,
	.metal-glint::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		background: rgba(255, 248, 214, 0.88);
		transform: translate(-50%, -50%);
	}
	.metal-glint::before {
		width: 520%;
		height: 20%;
	}
	.metal-glint::after {
		width: 20%;
		height: 520%;
	}
	.metal-glint.helmet-left {
		left: 31.5%;
		top: 34%;
		animation-delay: -1.5s;
	}
	.metal-glint.helmet-right {
		left: 66%;
		top: 36%;
		animation-delay: -7.2s;
		animation-duration: 13s;
	}
	.metal-glint.chest {
		left: 41%;
		top: 53.5%;
		animation-delay: -4.8s;
		animation-duration: 8.9s;
	}
	.metal-glint.shoulder {
		left: 58.5%;
		top: 49.7%;
		animation-delay: -5.7s;
		animation-duration: 9.5s;
	}
	.metal-glint.wrist {
		left: 63%;
		top: 58%;
		animation-delay: -9.4s;
		animation-duration: 9.2s;
	}
	.metal-glint.knee {
		left: 42%;
		top: 69%;
		animation-delay: -2.7s;
		animation-duration: 10.2s;
	}
	.metal-glint.boot {
		left: 43%;
		top: 77.2%;
		animation-delay: -6.3s;
		animation-duration: 10.8s;
	}
	@keyframes metal-pop {
		0%,
		31%,
		39%,
		100% {
			opacity: 0;
			transform: scale(0.45) rotate(0deg);
		}
		34% {
			opacity: calc(0.72 + var(--scene-light) * 0.28);
			transform: scale(1) rotate(20deg);
		}
		36% {
			opacity: 0.2;
			transform: scale(0.7) rotate(35deg);
		}
	}
	.poseidon-mascot:not(.idle) .visor-light,
	.poseidon-mascot:not(.idle) .helmet-ring-light,
	.poseidon-mascot:not(.idle) .chest-ring-light,
	.poseidon-mascot:not(.idle) .metal-glint {
		display: none;
	}
	/* The body, harness, and two cheap ghost copies follow one JS-computed route.
	   Idle-only overlays drop out during transit so they cannot float separately. */
	.snap-active .shadow,
	.snap-active .reflection,
	.snap-active .underglow,
	.snap-active .wind,
	.snap-active .visor-light,
	.snap-active .helmet-ring-light,
	.snap-active .chest-ring-light,
	.snap-active .metal-glint {
		opacity: 0;
		animation-play-state: paused;
	}
	.snap-afterimage {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: auto;
		z-index: 0;
		pointer-events: none;
		transform-origin: var(--harness-x) var(--harness-y);
		mix-blend-mode: screen;
		filter: sepia(1) saturate(2.4) hue-rotate(190deg) brightness(1.2);
		will-change: transform, opacity;
		opacity: 0;
	}
	.snap-afterimage.ghost-b {
		filter: sepia(1) saturate(2.2) hue-rotate(235deg) brightness(1.15);
	}
	.mascot-suction-trail {
		position: fixed;
		height: 7px;
		z-index: 5;
		pointer-events: none;
		transform-origin: 0 50%;
		border-radius: 50%;
		background: linear-gradient(
			90deg,
			rgba(165, 225, 255, 0),
			rgba(165, 225, 255, 0.2) 35%,
			rgba(198, 145, 255, 0.38) 78%,
			rgba(255, 213, 125, 0.06)
		);
		filter: blur(1px);
		animation: mascot-stream-pulse 360ms ease-in-out infinite alternate;
	}
	.mascot-suction-trail.returning {
		background: linear-gradient(
			90deg,
			rgba(255, 213, 125, 0.05),
			rgba(198, 145, 255, 0.32) 30%,
			rgba(165, 225, 255, 0.18) 72%,
			rgba(165, 225, 255, 0)
		);
	}
	@keyframes mascot-stream-pulse {
		from {
			opacity: 0.42;
			height: 5px;
		}
		to {
			opacity: 0.75;
			height: 9px;
		}
	}
	.mascot-hole-impact {
		position: fixed;
		z-index: 7;
		width: 130px;
		height: 86px;
		margin: -43px 0 0 -65px;
		pointer-events: none;
		border: 4px solid rgba(174, 224, 255, 0.72);
		border-radius: 50%;
		box-shadow:
			0 0 18px rgba(151, 105, 255, 0.82),
			inset 0 0 16px rgba(255, 211, 122, 0.52);
		animation: mascot-hole-impact 420ms cubic-bezier(0.16, 0.75, 0.24, 1) forwards;
	}
	.mascot-hole-impact.ejecting {
		border-color: rgba(255, 218, 132, 0.8);
		animation-name: mascot-hole-eject;
	}
	@keyframes mascot-hole-impact {
		from {
			transform: scale(0.2) rotate(-18deg);
			opacity: 0.95;
		}
		to {
			transform: scale(1.35) rotate(12deg);
			opacity: 0;
		}
	}
	@keyframes mascot-hole-eject {
		from {
			transform: scale(0.25) rotate(16deg);
			opacity: 1;
		}
		to {
			transform: scale(1.55) rotate(-12deg);
			opacity: 0;
		}
	}
	.snap-prize {
		position: absolute;
		top: 30%;
		left: 55%;
		font-family: proxima-nova, sans-serif;
		font-weight: 800;
		font-size: clamp(22px, 3vw, 40px);
		color: #faf0d6;
		-webkit-text-stroke: 2px #10081a;
		text-shadow: 4px 5px 0 #26104a;
		animation: prize-pop 900ms cubic-bezier(0.175, 0.885, 0.32, 1.4) forwards;
	}
	@keyframes prize-pop {
		0% {
			transform: scale(0.2) translateY(10px);
			opacity: 0;
		}
		25% {
			transform: scale(1.15);
			opacity: 1;
		}
		75% {
			transform: scale(1) translateY(-8px);
			opacity: 1;
		}
		100% {
			transform: scale(0.95) translateY(-22px);
			opacity: 0;
		}
	}

	.frame {
		position: relative;
		z-index: 1;
		height: 100%;
		width: auto;
		/* NEVER transformed. The rope's .tether-anchor is a sibling, so any transform
		   here would move the art out from under the rope end. Cat Rescue moves the
		   whole .mascot-body instead, which carries the anchor with it. */
		/* POP (owner 2026-07-27): gentle dodge-ish lift — brighter, punchier contrast,
		   a touch more colour — then the original soft dark-teal drop shadow.
		   NOTE: the earlier feConvolveMatrix sharpen was REMOVED — SVG convolution is
		   CPU-rasterised per frame on an animated image and tanked load/runtime perf.
		   Real sharpening belongs baked into the webp clips offline if wanted. */
		filter: brightness(calc(1.04 + var(--scene-light) * 0.08)) contrast(1.09) saturate(1.1)
			drop-shadow(0 5px 10px rgba(10, 46, 60, 0.32));
	}
	/* Attack effects touch the WebP canvas edges, so feather only those clips.
	   Keeping this off the always-running idle clip avoids masked-video raster
	   work during the slow depth transform. */
	.poseidon-mascot:not(.idle) .frame {
		/* EDGE FEATHER (reviewer: fx clips hard at the webp frame). The clips' souls/
		   embers reach the clip rect at full alpha (beam: all 4 sides; slam/smash/
		   tideraise: left+right) and cut off in a hard line. Fade the outer band of
		   the IMAGE to transparent — 10% on the sides/top, a gentler 6% at the bottom
		   (he is floor-anchored there) — so anything leaving frame dissolves instead
		   of cropping. Two gradients intersected = a feathered rectangle.
		   Idle never touches the edges, so it is pixel-identical. */
		--feather-x: 12.5%;
		--feather-t: 12.5%;
		--feather-b: 6%;
		-webkit-mask-image:
			linear-gradient(
				to right,
				transparent 0,
				#000 var(--feather-x),
				#000 calc(100% - var(--feather-x)),
				transparent 100%
			),
			linear-gradient(
				to bottom,
				transparent 0,
				#000 var(--feather-t),
				#000 calc(100% - var(--feather-b)),
				transparent 100%
			);
		-webkit-mask-composite: source-in;
		mask-image:
			linear-gradient(
				to right,
				transparent 0,
				#000 var(--feather-x),
				#000 calc(100% - var(--feather-x)),
				transparent 100%
			),
			linear-gradient(
				to bottom,
				transparent 0,
				#000 var(--feather-t),
				#000 calc(100% - var(--feather-b)),
				transparent 100%
			);
		mask-composite: intersect;
	}
	.poseidon-mascot.reduced-effects .glow,
	.poseidon-mascot.reduced-effects .shadow,
	.poseidon-mascot.reduced-effects .wind,
	.poseidon-mascot.reduced-effects .reflection,
	.poseidon-mascot.reduced-effects .underglow {
		display: none;
	}
	.poseidon-mascot.reduced-effects .frame {
		filter: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.poseidon-mascot,
		.visor-light,
		.helmet-ring-light,
		.chest-ring-light,
		.metal-glint {
			animation: none;
		}
	}
</style>
