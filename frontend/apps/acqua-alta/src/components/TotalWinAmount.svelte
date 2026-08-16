<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Sprite, Text } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, bonusPlateColumn } from '../game/constants';

	const context = getContext();
	// same brass plate as the FREE SPINS counter so the bonus HUD reads as one set
	const panelKey = 'fs_counter_plate';
	const PANEL_RATIO = 700 / 217;

	const board = $derived(context.stateGameDerived.boardLayout());
	const panelWidth = SYMBOL_SIZE * 3;
	const panelSizes = {
		width: panelWidth,
		height: panelWidth / PANEL_RATIO,
	};

	// Visible for the WHOLE bonus, using the same freegame gate the rest of the bonus
	// HUD uses. freeSpinEnd flips gameType back to 'basegame' immediately before the
	// outro count-up, so this fades out exactly as the big TOTAL WIN outro takes over
	// (and both land on stateBet.winBookEventAmount, so the numbers stay consistent).
	const show = $derived(context.stateGame.gameType === 'freegame');

	// Paired with the FREE SPINS counter:
	//  - stacked (portrait / tablet): the LEFT half of the two-up row that sits
	//    above the tumble plate, with the FREE SPINS counter in the right half.
	//    UNCHANGED — the move below is desktop-only.
	//  - wide (desktop / landscape): the bottom-RIGHT corner of the frame border.
	//
	// Neither plate is clamped against the main box any more. That clamp is what
	// owner 2026-08-07 (final): bottom-RIGHT corner of the frame border in BOTH
	// layouts, mirroring the FREE SPINS counter in the bottom-left. Same
	// bonusPlateColumn() call, so the pair shares one rail and one scale.
	const placement = $derived.by(() => {
		const column = bonusPlateColumn({
			board,
			plateWidth: panelSizes.width,
			plateHeight: panelSizes.height,
		});
		return { scale: column.scale, ...column.totalWin };
	});
	const scale = $derived(placement.scale);
	const position = $derived({ x: placement.x, y: placement.y });

	const titleSize = SYMBOL_SIZE * 0.22;
	const valueSize = SYMBOL_SIZE * 0.28;

	const textStyle = (size: number) =>
		({
			fontFamily: 'proxima-nova',
			fontWeight: '800',
			fontSize: size,
			letterSpacing: 1,
			fill: 0xffe7a0,
			stroke: { color: 0x06222e, width: Math.max(3, size * 0.2) },
		}) as const;

	// climb smoothly as each spin adds to the round total; settles on exactly
	// stateBet.winBookEventAmount — the same field/formatter LabelWin and the outro use
	const total = new Tween(stateBet.winBookEventAmount, { duration: 300, easing: cubicOut });
	$effect(() => {
		total.set(stateBet.winBookEventAmount);
	});
	const value = $derived(bookEventAmountToCurrencyString(total.current));
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Sprite key={panelKey} {...panelSizes} />
		<Text
			anchor={0.5}
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.36}
			text={'TOTAL WIN'}
			style={textStyle(titleSize)}
		/>
		<Text
			anchor={0.5}
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.66}
			text={value}
			style={textStyle(valueSize)}
		/>
	</FadeContainer>
</MainContainer>
