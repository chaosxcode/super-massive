<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, bonusPlateColumn } from '../game/constants';

	const context = getContext();
	// final art: brass counter plate (fs_counter_plate, 700x217)
	const panelKey = 'fs_counter_plate';
	const PANEL_RATIO = 700 / 217;

	const board = $derived(context.stateGameDerived.boardLayout());
	const panelWidth = SYMBOL_SIZE * 3;
	const panelSizes = {
		width: panelWidth,
		height: panelWidth / PANEL_RATIO,
	};
	const column = $derived(
		bonusPlateColumn({
			board,
			plateWidth: panelSizes.width,
			plateHeight: panelSizes.height,
		}),
	);
	const scale = $derived(column.scale);

	// STACKED (portrait / tablet): the right half of a two-up row that sits a full
	// row ABOVE the tumble plate, with TOTAL WIN in the left half. UNCHANGED —
	// the desktop move below is landscape-only.
	// owner 2026-08-07 (final): BOTH layouts put the pair on the frame's BOTTOM
	// border — FREE SPINS in the left corner, TOTAL WIN in the right. One code path,
	// so portrait and desktop cannot drift, and the top rail stays free for the
	// tumble-win announcement (which is what cleared revisions-PDF item 5).
	const position = $derived(column.freeSpins);

	const titleSize = SYMBOL_SIZE * 0.22;
	const valueSize = SYMBOL_SIZE * 0.28;

	const textStyle = (size: number) =>
		({
			fontFamily: 'proxima-nova',
			fontWeight: '800',
			fontSize: size,
			letterSpacing: 1,
			fill: 0xffd9ad,
			stroke: { color: 0x06222e, width: Math.max(3, size * 0.2) },
		}) as const;

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Sprite key={panelKey} {...panelSizes} />
		<Text
			anchor={0.5}
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.36}
			text={'FREE SPINS'}
			style={textStyle(titleSize)}
		/>
		<Text
			anchor={0.5}
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.66}
			text={`${current} OF ${total}`}
			style={textStyle(valueSize)}
		/>
	</FadeContainer>
</MainContainer>
