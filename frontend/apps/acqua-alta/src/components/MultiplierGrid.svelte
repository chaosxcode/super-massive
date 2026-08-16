<script lang="ts" module>
	import type { TideUpdatedCell } from '../game/typesBookEvent';

	export type EmitterEventMultiplierGrid =
		| { type: 'multiplierGridShow' }
		| { type: 'multiplierGridHide' }
		| { type: 'multiplierGridUpdate'; grid: number[][] }
		| { type: 'multiplierGridCellsUpdate'; cells: TideUpdatedCell[] } // tideLevel: pop new badges / count-up deepened ones
		| { type: 'multiplierGridClear' };

	// color-as-math badge ramp (design-final.json): brass x2-x4, gold x5-x7,
	// emerald-white x8-x10 (base cap), white-gold x11-x15, plasma x16-x20
	export const badgeColor = (multiplier: number) => {
		if (multiplier >= 16) return 0x6ff7ff;
		if (multiplier >= 11) return 0xfff3c4;
		if (multiplier >= 8) return 0xbdf5d8;
		if (multiplier >= 5) return 0xf2c94c;
		return 0xc9a227;
	};
</script>

<script lang="ts">
	import { backOut, cubicOut } from 'svelte/easing';
	import { BitmapText, Container, Sprite } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import { SFX } from '../game/soundMap';
	import { tween } from '../game/tween';

	const context = getContext();
	const BADGE_SIZE = SYMBOL_SIZE * 0.56;

	const emptyGrid = () =>
		Array.from({ length: BOARD_DIMENSIONS.x }, () => Array.from({ length: BOARD_DIMENSIONS.y }, () => 0)); // prettier-ignore

	let show = $state(false);
	let grid = $state(emptyGrid());
	// per-cell pop/pulse scale, mutated by the deepen/pop tweens
	let badgeScale = $state(
		Array.from({ length: BOARD_DIMENSIONS.x }, () => Array.from({ length: BOARD_DIMENSIONS.y }, () => 1)), // prettier-ignore
	);

	// new submersion: ONE brass badge master pops in with overshoot
	const popBadge = async (cell: TideUpdatedCell) => {
		badgeScale[cell.reel][cell.row] = 0;
		grid[cell.reel][cell.row] = cell.mult;
		context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.badgePop });
		await tween({ from: 0, to: 1.18, duration: 240, easing: backOut, onUpdate: (v) => (badgeScale[cell.reel][cell.row] = v) }); // prettier-ignore
		await tween({ from: 1.18, to: 1, duration: 110, easing: cubicOut, onUpdate: (v) => (badgeScale[cell.reel][cell.row] = v) }); // prettier-ignore
	};

	// deepen: count-up tick per step, +1 semitone per multiplier step
	const deepenBadge = async (cell: TideUpdatedCell, previous: number) => {
		for (let value = previous + 1; value <= cell.mult; value += 1) {
			grid[cell.reel][cell.row] = value;
			context.eventEmitter.broadcast({ type: 'soundBadgeTick', step: value - 2 });
			await tween({ from: 1, to: 1.22, duration: 90, easing: cubicOut, onUpdate: (v) => (badgeScale[cell.reel][cell.row] = v) }); // prettier-ignore
			await tween({ from: 1.22, to: 1, duration: 90, easing: cubicOut, onUpdate: (v) => (badgeScale[cell.reel][cell.row] = v) }); // prettier-ignore
		}
	};

	context.eventEmitter.subscribeOnMount({
		multiplierGridShow: () => (show = true),
		multiplierGridHide: () => (show = false),
		// deep-copy: adopting the book event's gridMultipliers array into $state
		// directly ties this component's reactivity to a foreign object (svelte
		// dev-mode ownership checks crash on the 2nd replay playback, and badge
		// pop/deepen mutations would leak back into the book)
		multiplierGridUpdate: (emitterEvent) => (grid = emitterEvent.grid.map((reel) => [...reel])),
		multiplierGridCellsUpdate: async (emitterEvent) => {
			show = true;
			await Promise.all(
				emitterEvent.cells.map(async (cell, cellIndex) => {
					await waitForTimeout(cellIndex * 25); // ripple stagger across the row
					const previous = grid[cell.reel]?.[cell.row] ?? 0;
					if (previous < 2) {
						await popBadge(cell);
					} else if (cell.mult > previous) {
						await deepenBadge(cell, previous);
					} else {
						grid[cell.reel][cell.row] = cell.mult;
					}
				}),
			);
		},
		multiplierGridClear: () => (grid = emptyGrid()),
	});
</script>

<BoardContainer>
	{#if show}
		{#each grid as reel, reelIndex}
			{#each reel as multiplier, rowIndex}
				{#if multiplier > 1}
					<Container
						x={(reelIndex + 0.5) * SYMBOL_SIZE}
						y={(rowIndex + 0.5) * SYMBOL_SIZE}
						scale={badgeScale[reelIndex][rowIndex]}
					>
						<!-- ONE neutral brass master sprite, tier-tinted in code -->
						<Sprite
							anchor={0.5}
							key="badge_brass"
							width={BADGE_SIZE}
							height={BADGE_SIZE}
							tint={badgeColor(multiplier)}
						/>
						<BitmapText
							anchor={{ x: 0.5, y: 0.5 }}
							text={`${multiplier} X`}
							style={{
								fontFamily: 'gold',
								fontSize: SYMBOL_SIZE * 0.3,
								letterSpacing: -4,
							}}
						/>
					</Container>
				{/if}
			{/each}
		{/each}
	{/if}
</BoardContainer>
