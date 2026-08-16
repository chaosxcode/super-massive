<script lang="ts">
	// The black hole firing Wilds back onto the board. The 225x EJECTA REACTOR
	// feature is built entirely out of this beat, so it has to be unmistakable:
	//
	//   0ms    the hole spools up (BlackHole draws imploding rings and inhales)
	//          while every destination cell is claimed by a dark socket + lock-on
	//          bracket, staggered so the player can count them.
	//   260ms  BURST — the hole bangs and the Wilds leave in a volley 80ms apart.
	//   ~300-450ms per bolt: upright, exactly one tile wide on arrival, trailing a
	//          comet streak, so the flight reads as ONE Wild and not a puff.
	//   impact the socket blows out, the scored Wild is asserted into the board and
	//          replays its own land squash + WILD label, under a gold shockwave.
	//
	// AUTHORITY: `positions` comes straight from the book and names the cells that
	// are ALREADY Wild in the scored math state. Nothing here invents, moves,
	// re-orders or filters a position — the animation only reveals what the math
	// decided. `assertWild` is idempotent and runs again after the sequence (and if
	// the safety budget expires), so a dropped frame, a hidden tab or an
	// interrupted round can never leave the drawn board disagreeing with the
	// scored one. That matters beyond cosmetics here: TumbleBoard seeds the next
	// cascade from `stateGame.board`, so a missed Wild would propagate.
	//
	// LEGACY DEFENCE: `row` is the padded reel index, and the visible band is
	// 1..BOARD_DIMENSIONS.y. Current production math guarantees every Ejecta target
	// is visible. The queued/feed-port path remains only so an old replay carrying
	// row 0 completes safely instead of drawing board furniture over the frame.
	//
	// NOTE on `$state` arrays: pushing an object literal stores a *new proxy* around
	// it, so mutating the local reference afterwards is inert (the previous version
	// of this file did exactly that — the Wild never actually moved). Always read
	// the element back out of the array and animate that, as WaterPlane does.
	import { Sprite } from 'pixi-svelte';
	import { backOut, cubicOut } from 'svelte/easing';

	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { BLACK_HOLE, BOARD_DIMENSIONS, REEL_PADDING, SYMBOL_SIZE } from '../game/constants';
	import { clock } from '../game/clock.svelte';
	import { SFX } from '../game/soundMap';
	import { performanceProfile } from '../game/performance.svelte';
	import { createTweenToken, tween, type TweenToken } from '../game/tween';
	import type { Position } from '../game/types';

	const context = getContext();
	const stacked = $derived(context.stateLayoutDerived.isStacked());
	const HX = $derived(stacked ? 350 : BLACK_HOLE.x);
	const HY = $derived(stacked ? 830 : BLACK_HOLE.y);

	// --- timing (ms, before the turbo time scale) -------------------------------
	// Deliberately bounded: one tumble chain can carry up to 10 of these (book
	// 161), so the whole beat lands inside ~1.1s and never stacks with itself.
	const LOCK_STAGGER = 55; // gap between destination cells lighting up
	const LOCK_MS = 210; // bracket snap-in per cell
	const CHARGE_MS = 260; // hole spool-up before the burst
	const SHOT_STAGGER = 80; // gap between bolts leaving the hole
	const FLIGHT_BASE = 300;
	const FLIGHT_PER_PX = 0.15;
	const FLIGHT_EXTRA_MAX = 150;
	const IMPACT_MS = 300;

	type Target = {
		id: number;
		x: number;
		y: number;
		queued: boolean; // defensive handling for a legacy off-grid replay
		lock: number;
		impact: number;
	};
	type Flight = {
		id: number;
		x: number;
		y: number;
		ax: number; // near afterimage
		ay: number;
		bx: number; // far afterimage — also the streak tail
		by: number;
		scale: number;
		alpha: number;
	};

	let targets = $state<Target[]>([]);
	let flights = $state<Flight[]>([]);
	let nextId = 0;
	let sequence: TweenToken = createTweenToken();

	const FLECKS = Array.from({ length: performanceProfile.reducedEffects ? 4 : 8 }, (_, i) => i);
	const PORT_FLECKS = [0, 1, 2, 3];
	const AFTERIMAGES = performanceProfile.reducedEffects ? [] : [0, 1];
	const BRACKETS = [0, 1, 2, 3]; // top, right, bottom, left

	const pointOnCurve = (
		progress: number,
		start: { x: number; y: number },
		control: { x: number; y: number },
		end: { x: number; y: number },
	) => {
		const inv = 1 - progress;
		return {
			x: inv * inv * start.x + 2 * inv * progress * control.x + progress * progress * end.x,
			y: inv * inv * start.y + 2 * inv * progress * control.y + progress * progress * end.y,
		};
	};

	// Current books always land inside this band; retain the off-grid branch for
	// backwards-compatible replay only.
	const isQueued = (position: Position) => position.row < 1 || position.row > BOARD_DIMENSIONS.y;

	// board-local centre of a book position. `row` is the PADDED reel index the
	// book uses — same mapping as getSymbolY and ClusterWinAmount, so the flight
	// ends exactly on the scored cell. A legacy queued Wild aims at the top edge
	// of its reel instead, where it is drawn up into the feed.
	const cellPoint = (position: Position) =>
		isQueued(position)
			? // owner: land INSIDE the top of the reel, not above it. Ending at y=-18 sent
				// the bolt up past the frame rail, which read as the hole shooting a Wild
				// off into space. Diving into the column reads as loading it instead.
				{ x: SYMBOL_SIZE * (position.reel + REEL_PADDING), y: SYMBOL_SIZE * 0.34 }
			: {
					x: SYMBOL_SIZE * (position.reel + REEL_PADDING),
					y: SYMBOL_SIZE * (position.row - 0.5),
				};

	const playSound = (name: (typeof SFX)[keyof typeof SFX]) =>
		context.eventEmitter.broadcast({ type: 'soundOnce', name, forcePlay: true });

	/** Idempotent: force the scored Wild into the rendered board if it is not
	 *  already there. Only ever touches a cell the book named. */
	const assertWild = (position: Position) => {
		const reelSymbol = context.stateGame.board[position.reel]?.reelState.symbols[position.row];
		if (!reelSymbol || reelSymbol.rawSymbol.name === 'W') return;
		reelSymbol.rawSymbol = { name: 'W' };
		reelSymbol.symbolState = 'land';
	};

	/** Impact commit: assert the Wild AND replay the real board symbol's land
	 *  squash + WILD label, so the settle happens on the scored tile itself. */
	const commitWild = (position: Position) => {
		const reelSymbol = context.stateGame.board[position.reel]?.reelState.symbols[position.row];
		if (!reelSymbol) return;
		if (reelSymbol.rawSymbol.name !== 'W') reelSymbol.rawSymbol = { name: 'W' };
		reelSymbol.symbolState = 'land';
	};

	const runShot = async ({
		position,
		index,
		token,
		scale,
		isLast,
	}: {
		position: Position;
		index: number;
		token: TweenToken;
		scale: (value: number) => number;
		isLast: boolean;
	}) => {
		const end = cellPoint(position);
		const queued = isQueued(position);
		const id = (nextId += 1);

		// --- 1. claim the destination cell (or the reel's feed port) ------------
		await waitForTimeout(scale(index * LOCK_STAGGER));
		if (token.cancelled) return;
		targets.push({ id, x: end.x, y: end.y, queued, lock: 0, impact: 0 });
		const target = targets[targets.length - 1]; // the reactive proxy, not the literal
		await tween({
			from: 0,
			to: 1,
			duration: scale(LOCK_MS),
			easing: backOut,
			onUpdate: (value) => (target.lock = value),
			token,
		});

		// hold the lock until this bolt's turn to leave the hole
		const firesAt = CHARGE_MS + index * SHOT_STAGGER;
		const lockedAt = index * LOCK_STAGGER + LOCK_MS;
		await waitForTimeout(scale(Math.max(0, firesAt - lockedAt)));
		if (token.cancelled) {
			targets = targets.filter((existing) => existing.id !== id);
			return;
		}

		// --- 2. flight ---------------------------------------------------------
		const start = { x: HX, y: HY };
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		const distance = Math.max(1, Math.hypot(dx, dy));
		// a readable bow, not a loop; alternating sides separate simultaneous bolts
		const arc = Math.min(110, distance * 0.16) * (index % 2 === 0 ? 1 : -1);
		const control = {
			x: (start.x + end.x) * 0.5 + (-dy / distance) * arc,
			y: (start.y + end.y) * 0.5 + (dx / distance) * arc,
		};
		flights.push({
			id,
			x: start.x,
			y: start.y,
			ax: start.x,
			ay: start.y,
			bx: start.x,
			by: start.y,
			scale: 0.5,
			alpha: 0,
		});
		const flight = flights[flights.length - 1]; // reactive proxy
		await tween({
			from: 0,
			to: 1,
			duration: scale(FLIGHT_BASE + Math.min(FLIGHT_EXTRA_MAX, distance * FLIGHT_PER_PX)),
			easing: cubicOut, // muzzle-fast out of the hole, settling into the cell
			onUpdate: (progress) => {
				const head = pointOnCurve(progress, start, control, end);
				const near = pointOnCurve(Math.max(0, progress - 0.06), start, control, end);
				const far = pointOnCurve(Math.max(0, progress - 0.14), start, control, end);
				flight.x = head.x;
				flight.y = head.y;
				flight.ax = near.x;
				flight.ay = near.y;
				flight.bx = far.x;
				flight.by = far.y;
				// grows from a compact bolt to exactly one board tile on arrival —
				// never larger, so it cannot smother the cells it crosses
				flight.scale = 0.5 + progress * 0.5;
				flight.alpha = Math.min(1, progress * 6);
				if (queued) {
					// slips behind the top row as it enters the column — full size all
					// the way in, then a quick fade, so it reads as going INTO the
					// machine rather than shrinking away into the distance
					flight.alpha *= 1 - Math.max(0, progress - 0.86) / 0.14;
				}
			},
			token,
		});
		flights = flights.filter((existing) => existing.id !== id);
		if (token.cancelled) {
			targets = targets.filter((existing) => existing.id !== id);
			return;
		}

		// --- 3. landing on the scored board ------------------------------------
		commitWild(position);
		playSound(SFX.reelStop);
		if (isLast) playSound(SFX.wildLand);
		await tween({
			from: 0,
			to: 1,
			duration: scale(IMPACT_MS),
			easing: cubicOut,
			onUpdate: (value) => (target.impact = value),
			token,
		});
		targets = targets.filter((existing) => existing.id !== id);
	};

	context.eventEmitter.subscribeOnMount({
		wildEjectaFly: async ({ positions }) => {
			// A new launch always supersedes anything still on screen. Book events are
			// awaited one at a time so this should never fire mid-sequence, but an
			// interrupted or resumed round must not leave a socket or bolt behind.
			sequence.cancelled = true;
			sequence = createTweenToken();
			const token = sequence;
			targets = [];
			flights = [];

			const speed = Math.max(1, stateBetDerived.timeScale());
			const scale = (value: number) => value / speed;

			// the hole spools up; BlackHole owns that visual (imploding rings + inhale)
			playSound(SFX.tideSurge);
			context.eventEmitter.broadcast({
				type: 'blackHoleEjectaCharge',
				duration: scale(CHARGE_MS),
			});

			const burst = (async () => {
				await waitForTimeout(scale(CHARGE_MS));
				if (token.cancelled) return;
				context.eventEmitter.broadcast({ type: 'blackHoleEjectaBurst' });
				playSound(SFX.wildExplode);
			})();

			const shots = positions.map((position, index) =>
				runShot({ position, index, token, scale, isLast: index === positions.length - 1 }),
			);

			// Bounded: rAF stalls while the tab is hidden, so race the animation
			// against a setTimeout budget. Losing the race still commits the board.
			const budget =
				scale(
					CHARGE_MS +
						Math.max(0, positions.length - 1) * SHOT_STAGGER +
						FLIGHT_BASE +
						FLIGHT_EXTRA_MAX +
						IMPACT_MS,
				) + 400;
			await Promise.race([Promise.all([burst, ...shots]), waitForTimeout(budget)]);

			token.cancelled = true;
			// the event is authoritative — the board matches it whatever the animation did
			positions.forEach(assertWild);
			if (token === sequence) {
				targets = [];
				flights = [];
			}
		},
	});

	// --- render helpers ---------------------------------------------------------
	const breath = $derived(0.5 + 0.5 * Math.sin(clock.now / 110));

	const bracketProps = (target: Target, index: number) => {
		const vertical = index % 2 === 1; // 1 = right, 3 = left
		const sign = index === 0 || index === 3 ? -1 : 1; // 0 = top, 2 = bottom
		const offset = SYMBOL_SIZE * (0.72 - 0.2 * target.lock) * sign;
		return {
			x: target.x + (vertical ? offset : 0),
			y: target.y + (vertical ? 0 : offset),
			rotation: vertical ? 0 : Math.PI / 2, // gleam_bar is vertical in texture space
			width: 11,
			height: SYMBOL_SIZE * (0.34 + 0.24 * target.lock),
			alpha: target.lock * (0.5 + 0.4 * breath) * (1 - target.impact),
		};
	};

	const portFleckProps = (target: Target, index: number) => ({
		x: target.x + ((index % 4) - 1.5) * SYMBOL_SIZE * 0.2 * (0.6 + target.impact * 0.6),
		y: 8 + target.impact * SYMBOL_SIZE * 0.62,
		width: 10 - target.impact * 4,
		height: 34 - target.impact * 14,
		alpha: Math.pow(1 - target.impact, 1.5) * 0.9,
	});

	const fleckProps = (target: Target, index: number) => {
		const angle = (index / FLECKS.length) * Math.PI * 2 + target.id * 0.7;
		const radius = SYMBOL_SIZE * (0.24 + target.impact * (0.78 + (index % 2) * 0.18));
		return {
			x: target.x + Math.cos(angle) * radius,
			y: target.y + Math.sin(angle) * radius,
			rotation: angle,
			width: 13 - target.impact * 6,
			height: 40 - target.impact * 18,
			alpha: Math.pow(1 - target.impact, 1.6) * 0.95,
		};
	};

	const streakProps = (flight: Flight) => {
		const dx = flight.x - flight.bx;
		const dy = flight.y - flight.by;
		const length = Math.hypot(dx, dy);
		return {
			x: (flight.x + flight.bx) * 0.5,
			y: (flight.y + flight.by) * 0.5,
			rotation: Math.atan2(dy, dx) - Math.PI / 2,
			width: 26 * flight.scale,
			height: Math.max(SYMBOL_SIZE * 0.35, length * 1.15),
			alpha: flight.alpha * 0.6,
		};
	};

	const afterimageProps = (flight: Flight, index: number) => {
		const size = SYMBOL_SIZE * 0.94 * flight.scale * (0.94 - index * 0.1);
		return {
			x: index === 0 ? flight.ax : flight.bx,
			y: index === 0 ? flight.ay : flight.by,
			width: size,
			height: size,
			alpha: flight.alpha * (0.26 - index * 0.12),
		};
	};
</script>

<BoardContainer>
	<!-- DESTINATION CELLS — claimed the instant the hole starts spooling up so the
	     player is already looking at the right cell. The socket is one cell wide
	     (0.98) and never bleeds onto a neighbour. -->
	{#each targets as target (target.id)}
		{#if target.queued}
			<!-- LEGACY REPLAY — no visible cell to claim, so mark the reel's top lip.
			     Current production books never take this branch. -->
			<Sprite
				key="particle_bubble"
				anchor={0.5}
				blendMode="add"
				tint={0x9df4ff}
				x={target.x}
				y={7}
				width={SYMBOL_SIZE * (0.5 + 0.4 * target.lock)}
				height={SYMBOL_SIZE * (0.3 + 0.24 * target.lock)}
				alpha={target.lock * 0.34 * (1 - target.impact)}
			/>
			{#if target.impact > 0}
				{#each PORT_FLECKS as fleck (fleck)}
					<Sprite
						key="particle_gold_fleck"
						anchor={0.5}
						blendMode="add"
						tint={fleck % 2 === 0 ? 0x8eeeff : 0xffd66f}
						{...portFleckProps(target, fleck)}
					/>
				{/each}
			{/if}
		{:else}
			<!-- owner: the dark lock-on socket is GONE. It read as a black square
			     sitting on the cell while the symbols animated out, and the launch
			     already reads without it — the glow and the brackets carry the
			     lock-on on their own. -->
			<Sprite
				key="overlay_ripple"
				anchor={0.5}
				blendMode="add"
				tint={0x6fe9ff}
				x={target.x}
				y={target.y}
				rotation={clock.now * 0.0018}
				width={SYMBOL_SIZE * (2.1 - target.lock * 0.98)}
				height={SYMBOL_SIZE * (2.1 - target.lock * 0.98)}
				alpha={target.lock * (0.4 + 0.3 * breath) * (1 - target.impact)}
			/>
			{#each BRACKETS as bracket (bracket)}
				<Sprite
					key="part_gleam_bar"
					anchor={0.5}
					blendMode="add"
					tint={0x9df4ff}
					{...bracketProps(target, bracket)}
				/>
			{/each}

			<!-- LANDING — shockwave, core flash and flecks over the cell that just
			     took the Wild. The scored tile underneath plays its own squash and
			     pops its own WILD label. -->
			{#if target.impact > 0}
				<Sprite
					key="overlay_ripple"
					anchor={0.5}
					blendMode="add"
					tint={0xffd66f}
					x={target.x}
					y={target.y}
					rotation={target.impact * 1.1}
					width={SYMBOL_SIZE * (0.95 + target.impact * 1.5)}
					height={SYMBOL_SIZE * (0.95 + target.impact * 1.5)}
					alpha={Math.pow(1 - target.impact, 1.5) * 0.95}
				/>
				<Sprite
					key="particle_bubble"
					anchor={0.5}
					blendMode="add"
					tint={0xfff2c4}
					x={target.x}
					y={target.y}
					width={SYMBOL_SIZE * (0.7 + target.impact * 0.9)}
					height={SYMBOL_SIZE * (0.7 + target.impact * 0.9)}
					alpha={Math.pow(1 - target.impact, 2.4) * 0.9}
				/>
				{#each FLECKS as fleck (fleck)}
					<Sprite
						key="particle_gold_fleck"
						anchor={0.5}
						blendMode="add"
						tint={fleck % 2 === 0 ? 0x8eeeff : 0xffd66f}
						{...fleckProps(target, fleck)}
					/>
				{/each}
			{/if}
		{/if}
	{/each}

	<!-- FLIGHT — an upright, board-sized Wild tile riding a comet streak. It never
	     spins (a tumbling tile is unreadable) and never grows past one cell. -->
	{#each flights as flight (flight.id)}
		<Sprite
			key="part_gleam_bar"
			anchor={0.5}
			blendMode="add"
			tint={0x8eeeff}
			{...streakProps(flight)}
		/>
		<Sprite
			key="particle_bubble"
			anchor={0.5}
			blendMode="add"
			tint={0x9df4ff}
			x={flight.x}
			y={flight.y}
			width={SYMBOL_SIZE * 1.5 * flight.scale}
			height={SYMBOL_SIZE * 1.5 * flight.scale}
			alpha={flight.alpha * 0.5}
		/>
		{#each AFTERIMAGES as afterimage (afterimage)}
			<Sprite
				key="symbol_W"
				anchor={0.5}
				blendMode="add"
				tint={0xbfe9ff}
				{...afterimageProps(flight, afterimage)}
			/>
		{/each}
		<Sprite
			key="symbol_W"
			anchor={0.5}
			x={flight.x}
			y={flight.y}
			width={SYMBOL_SIZE * 0.94 * flight.scale}
			height={SYMBOL_SIZE * 0.94 * flight.scale}
			alpha={flight.alpha}
		/>
	{/each}
</BoardContainer>
