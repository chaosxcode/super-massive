<script lang="ts" module>
	export type EmitterEventEjectaReactor =
		| { type: 'ejectaReactorShow' }
		| { type: 'ejectaReactorHide' }
		| { type: 'ejectaReactorCharge'; amount: number }
		| { type: 'ejectaReactorFire' };
</script>

<script lang="ts">
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';


	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { BLACK_HOLE, BOARD_SIZES } from '../game/constants';
	import { createTweenToken, tween, type TweenToken } from '../game/tween';
	import { sceneLightPulse, lightFlicker, lightSweepProgress, lightSweepAlpha } from '../game/light.svelte';

	const context = getContext();
	const stacked = $derived(context.stateLayoutDerived.isStacked());
	const HX = $derived(stacked ? 350 : BLACK_HOLE.x);
	const HY = $derived(stacked ? 830 : BLACK_HOLE.y);

	const PANEL_WIDTH = 248;
	const PANEL_HEIGHT = 92;
	const SEGMENT_SIZE = 48;
	const SEGMENT_GAP = 12;
	const SEGMENT_X = (PANEL_WIDTH - SEGMENT_SIZE * 3 - SEGMENT_GAP * 2) / 2;
	const SEGMENT_Y = 38;
	const SEGMENT_HEIGHT = 38;
	const SEGMENTS = [0, 1, 2];

	// Housing geometry. The panel metrics above are deliberately UNCHANGED — the
	// discharge sparks aim from SEGMENT_X/Y, so re-shaping the chrome must not
	// move the readout.
	const CHAMFER = 13; // angled corners read as machined brass, not a CSS box
	const BEZEL = 7; // brass rim thickness around the recessed well
	const RIVET_R = 3.4;

	/** Octagonal (chamfered) rectangle — the base shape of every plate here. */
	const chamferPoly = (x: number, y: number, w: number, h: number, c: number) => [
		x + c, y,
		x + w - c, y,
		x + w, y + c,
		x + w, y + h - c,
		x + w - c, y + h,
		x + c, y + h,
		x, y + h - c,
		x, y + c,
	]; // prettier-ignore

	const W = PANEL_WIDTH;
	const H = PANEL_HEIGHT;
	const RIVETS = [
		{ x: CHAMFER - 1, y: CHAMFER - 1 },
		{ x: W - CHAMFER + 1, y: CHAMFER - 1 },
		{ x: CHAMFER - 1, y: H - CHAMFER + 1 },
		{ x: W - CHAMFER + 1, y: H - CHAMFER + 1 },
	];

	/** Static chrome: cast shadow, brass shell, machined bevel, recessed well and
	 *  rivets. Drawn ONCE — every animated response below is a tint/alpha change
	 *  on a sibling, never a Graphics redraw, so a full meter costs no retesselation. */
	const drawHousing = (g: import('pixi.js').Graphics) => {
		// cast shadow, offset down-right like every other lit object in the scene
		g.poly(chamferPoly(2, 5, W, H, CHAMFER)).fill({ color: 0x000000, alpha: 0.42 });
		// brass shell + dark outline so it reads against the starfield
		g.poly(chamferPoly(0, 0, W, H, CHAMFER)).fill({ color: 0x8a6626 });
		g.poly(chamferPoly(0, 0, W, H, CHAMFER)).stroke({ color: 0x241704, width: 2, alignment: 1 });
		// top bevel catches the key light, bottom bevel falls into shade
		g.poly(chamferPoly(1.5, 1.5, W - 3, H * 0.42, CHAMFER - 2))
			.fill({ color: 0xe4c179, alpha: 0.4 });
		g.poly(chamferPoly(1.5, H * 0.66, W - 3, H * 0.32, CHAMFER - 2))
			.fill({ color: 0x3d2a09, alpha: 0.45 });
		// recessed well
		g.poly(chamferPoly(BEZEL, BEZEL, W - BEZEL * 2, H - BEZEL * 2, CHAMFER - 4))
			.fill({ color: 0x120b28, alpha: 0.97 });
		// inner shadow along the top lip sells the recess
		g.poly(chamferPoly(BEZEL, BEZEL, W - BEZEL * 2, 9, CHAMFER - 4))
			.fill({ color: 0x000000, alpha: 0.5 });
		g.poly(chamferPoly(BEZEL, BEZEL, W - BEZEL * 2, H - BEZEL * 2, CHAMFER - 4))
			.stroke({ color: 0x000000, width: 1.5, alignment: 0, alpha: 0.7 });
		// rivets
		for (const r of RIVETS) {
			g.circle(r.x, r.y, RIVET_R).fill({ color: 0x4a3410 });
			g.circle(r.x - 0.7, r.y - 0.8, RIVET_R * 0.62).fill({ color: 0xf0d391, alpha: 0.9 });
		}
	};

	/** The three charge wells, sunk into the plate. Also static. */
	const drawWells = (g: import('pixi.js').Graphics) => {
		for (const segment of SEGMENTS) {
			const x = SEGMENT_X + segment * (SEGMENT_SIZE + SEGMENT_GAP);
			g.roundRect(x, SEGMENT_Y, SEGMENT_SIZE, SEGMENT_HEIGHT, 7)
				.fill({ color: 0x080418, alpha: 0.92 });
			g.roundRect(x + 1, SEGMENT_Y + 1, SEGMENT_SIZE - 2, 7, 5)
				.fill({ color: 0x000000, alpha: 0.55 });
			g.roundRect(x, SEGMENT_Y, SEGMENT_SIZE, SEGMENT_HEIGHT, 7)
				.stroke({ color: 0x5b4a86, width: 1.5, alignment: 0, alpha: 0.85 });
			// rim light along the bottom edge
			g.roundRect(x + 2, SEGMENT_Y + SEGMENT_HEIGHT - 3, SEGMENT_SIZE - 4, 2, 1)
				.fill({ color: 0x9d8fd0, alpha: 0.35 });
		}
	};

	/** One filled cell: glowing core plus a bright top meniscus. Static geometry,
	 *  animated purely through the parent's alpha and tint. */
	const drawCell = (g: import('pixi.js').Graphics) => {
		g.roundRect(2, 2, SEGMENT_SIZE - 4, SEGMENT_HEIGHT - 4, 5).fill({ color: 0xffffff });
		g.roundRect(4, 3.5, SEGMENT_SIZE - 8, 5, 3).fill({ color: 0xffffff, alpha: 0.55 });
	};

	// --- live lighting, shared with the rest of the scene -------------------
	const scenePulse = $derived(sceneLightPulse());
	// a specular highlight travelling across the brass every few seconds
	const sweep = $derived(lightSweepProgress(5200, 900, 610));
	const sweepAlpha = $derived(lightSweepAlpha(sweep, 610));
	const flicker = $derived(lightFlicker(240));

	// panel origin in board coordinates — shared by the panel and by the discharge
	// sparks, which are drawn OUTSIDE the panel container so the pulse scale
	// (which scales about the container's top-left) cannot skew their aim.
	// WIDE (owner, 2026-08-07): the BOTTOM-CENTRE of the frame border, between the
	// FREE SPINS plate in the bottom-left corner and TOTAL WIN in the bottom-right.
	// Board coords: the bottom rail starts at BOARD height * 0.51 below the board
	// top and is ~100px thick, so the 92px panel sits centred in it.
	// STACKED keeps its old position above the hole.
	const RAIL_TOP = BOARD_SIZES.height * 1.01;
	const RAIL_HEIGHT = 141 * ((BOARD_SIZES.width * 1.02) / 722) * 0.72;
	const PANEL_X = $derived(stacked ? HX - PANEL_WIDTH / 2 : BOARD_SIZES.width / 2 - PANEL_WIDTH / 2);
	const PANEL_Y = $derived(
		stacked ? HY - 214 : RAIL_TOP + (RAIL_HEIGHT - PANEL_HEIGHT) / 2,
	);

	let show = $state(false);
	let charge = $state(0); // the authoritative meter value
	let pulse = $state(0);
	let discharge = $state(0); // 0..1 drain animation of a fire
	let draining = $state(0); // how many segments that drain is emptying
	let plateAlpha = $state(1); // opaque backing plate only — text and segments stay lit
	let token: TweenToken = createTweenToken();
	let dischargeToken: TweenToken = createTweenToken();
	let plateToken: TweenToken = createTweenToken();

	const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

	/** The panel used to thin its own backing to 0.3 during a launch, because
	 *  Game.svelte mounted <WildEjecta /> BEFORE <EjectaReactor />, so the bolts
	 *  flew BEHIND the panel and the plate had to get out of their way. The mount
	 *  order is now reversed and the bolts fly over it, so the plate stays fully
	 *  opaque and the housing keeps its lighting through the whole launch.
	 *
	 *  A brief brightening remains — the housing catching the flash of its own
	 *  discharge, which is the opposite of the old apology for being in the way. */
	const flashPlateForLaunch = async () => {
		plateToken.cancelled = true;
		plateToken = createTweenToken();
		const activeToken = plateToken;
		await tween({ from: plateAlpha, to: 1, duration: 120, easing: cubicOut, onUpdate: (value) => (plateAlpha = value), token: activeToken }); // prettier-ignore
	};

	const animatePulse = async (peak = 1) => {
		token.cancelled = true;
		token = createTweenToken();
		await tween({
			from: pulse,
			to: peak,
			duration: 180,
			easing: cubicOut,
			onUpdate: (value) => (pulse = value),
			token,
		});
		await tween({
			from: peak,
			to: 0,
			duration: 320,
			easing: cubicOut,
			onUpdate: (value) => (pulse = value),
			token,
		});
	};

	context.eventEmitter.subscribeOnMount({
		ejectaReactorShow: () => {
			dischargeToken.cancelled = true;
			plateToken.cancelled = true;
			show = true;
			charge = 0;
			pulse = 0;
			discharge = 0;
			draining = 0;
			plateAlpha = 1;
		},
		ejectaReactorHide: () => {
			dischargeToken.cancelled = true;
			plateToken.cancelled = true;
			show = false;
			charge = 0;
			pulse = 0;
			discharge = 0;
			draining = 0;
			plateAlpha = 1;
		},
		ejectaReactorCharge: async ({ amount }) => {
			// a new charge always supersedes a drain still playing out
			dischargeToken.cancelled = true;
			discharge = 0;
			draining = 0;
			charge = Math.min(3, charge + Math.max(0, amount));
			await animatePulse(charge === 3 ? 1.25 : 0.72);
		},
		// Fired on ANY wildEjecta while in `ejecta` mode — the single trigger path.
		// Deliberately NOT awaited by the handler: the meter dumping into the hole
		// is meant to overlap the hole's spool-up, so cause and effect read as one
		// action instead of two queued animations.
		//
		// The meter empties IMMEDIATELY (`charge = 0`) and the drain is purely
		// decorative from there. That ordering matters: because the fire is no
		// longer awaited, a charge from the very next winInfo can land while the
		// drain is still running, and a trailing `charge = 0` would have silently
		// eaten it.
		ejectaReactorFire: async () => {
			dischargeToken.cancelled = true;
			dischargeToken = createTweenToken();
			const activeToken = dischargeToken;
			charge = 0;
			draining = 3;
			discharge = 0;
			animatePulse(1.55);
			flashPlateForLaunch();
			await tween({
				from: 0,
				to: 1,
				duration: 460,
				easing: cubicOut,
				onUpdate: (value) => (discharge = value),
				token: activeToken,
			});
			if (activeToken.cancelled) return;
			discharge = 0;
			draining = 0;
		},
	});

	// gold while full or firing, cyan while filling
	const hot = $derived(charge === 3 || draining > 0);

	/** 1 while a segment holds its charge, falling to 0 as its spark leaves for
	 *  the hole — the meter visibly empties into the launch. */
	const segmentFill = (segment: number) => {
		if (draining > 0 && segment < draining) {
			return 1 - clamp01(discharge * 1.4 - segment * 0.14);
		}
		return segment < charge ? 1 : 0;
	};

	const sparkProps = (segment: number) => {
		const progress = clamp01(discharge * 1.4 - segment * 0.14);
		const from = {
			x: PANEL_X + SEGMENT_X + segment * (SEGMENT_SIZE + SEGMENT_GAP) + SEGMENT_SIZE / 2,
			y: PANEL_Y + SEGMENT_Y + SEGMENT_HEIGHT / 2,
		};
		const eased = cubicIn(progress);
		const trail = cubicIn(Math.max(0, progress - 0.22));
		const head = { x: from.x + (HX - from.x) * eased, y: from.y + (HY - from.y) * eased };
		const tail = { x: from.x + (HX - from.x) * trail, y: from.y + (HY - from.y) * trail };
		const dx = head.x - tail.x;
		const dy = head.y - tail.y;
		return {
			x: (head.x + tail.x) * 0.5,
			y: (head.y + tail.y) * 0.5,
			rotation: Math.atan2(dy, dx) - Math.PI / 2, // gleam_bar is vertical in texture space
			width: 14,
			height: Math.max(10, Math.hypot(dx, dy) * 1.15),
			alpha: progress > 0 && progress < 1 ? Math.min(1, progress * 8) * (1 - progress * 0.35) : 0,
		};
	};
</script>

{#if show}
	<BoardContainer>
		<Container x={PANEL_X} y={PANEL_Y} scale={1 + pulse * 0.055}>
			<Sprite
				key="overlay_ripple"
				anchor={0.5}
				x={PANEL_WIDTH / 2}
				y={PANEL_HEIGHT / 2}
				width={PANEL_WIDTH * (1.04 + pulse * 0.16)}
				height={PANEL_HEIGHT * (1.2 + pulse * 0.2)}
				tint={hot ? 0xffd85c : 0x45e9ff}
				alpha={0.2 + pulse * 0.36}
				blendMode="add"
			/>
			<!-- machined brass housing: shadow, shell, bevels, recessed well, rivets.
			     `alpha` carries the launch-window thinning; the geometry never redraws. -->
			<Container alpha={plateAlpha}>
				<Graphics draw={drawHousing} tint={hot ? 0xffe0a4 : 0xdfe8ff} />
				<!-- specular gleam travelling across the brass, gated by the shared
				     scene light so the panel breathes with the board and the mascot -->
				<Sprite
					key="part_gleam_bar"
					anchor={0.5}
					blendMode="add"
					tint={0xfff3cf}
					x={sweep < 0 ? 0 : sweep * (PANEL_WIDTH + 120) - 60}
					y={PANEL_HEIGHT / 2}
					width={54}
					height={PANEL_HEIGHT * 1.5}
					rotation={0.32}
					alpha={sweepAlpha * 0.5}
				/>
				<Graphics draw={drawWells} />
			</Container>

			<Text
				anchor={{ x: 0.5, y: 0 }}
				x={PANEL_WIDTH / 2}
				y={11}
				text={discharge > 0 ? 'REACTOR FIRES' : 'EJECTA REACTOR'}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 17,
					fontWeight: '800',
					letterSpacing: 2.2,
					fill: discharge > 0 ? 0xfff0c2 : 0xf3ecff,
					stroke: { color: 0x140828, width: 4 },
					dropShadow: {
						color: hot ? 0xffb32a : 0x36c8ff,
						alpha: 0.5 + scenePulse * 0.4,
						blur: 5,
						distance: 0,
						angle: 0,
					},
				}}
			/>

			{#each SEGMENTS as segment (segment)}
				{@const fill = segmentFill(segment)}
				{#if fill > 0}
					<Container
						x={SEGMENT_X + segment * (SEGMENT_SIZE + SEGMENT_GAP)}
						y={SEGMENT_Y}
						alpha={fill}
					>
						<!-- bloom sitting under the cell so the charge reads as light,
						     not paint; intensity rides the shared scene pulse -->
						<Sprite
							key="overlay_ripple"
							anchor={0.5}
							x={SEGMENT_SIZE / 2}
							y={SEGMENT_HEIGHT / 2}
							width={SEGMENT_SIZE * (1.85 + pulse * 0.5)}
							height={SEGMENT_HEIGHT * (2.3 + pulse * 0.7)}
							tint={hot ? 0xffc23a : 0x38e8ff}
							alpha={0.32 + scenePulse * 0.26 + pulse * 0.3}
							blendMode="add"
						/>
						<Graphics
							draw={drawCell}
							tint={hot ? 0xffcf43 : 0x38e8ff}
							alpha={0.86 + flicker * 0.14}
						/>
					</Container>
				{/if}
			{/each}
		</Container>

		<!-- the three charges dumping out of the meter and down into the hole. Drawn
		     ABOVE the panel (so they visibly leave their segments) and OUTSIDE its
		     container (so the pulse scale, which scales about the container's
		     top-left, cannot skew their aim at the hole anchor). -->
		{#if discharge > 0}
			{#each SEGMENTS as segment (segment)}
				<Sprite
					key="part_gleam_bar"
					anchor={0.5}
					blendMode="add"
					tint={0xffd85c}
					{...sparkProps(segment)}
				/>
			{/each}
		{/if}
	</BoardContainer>
{/if}
