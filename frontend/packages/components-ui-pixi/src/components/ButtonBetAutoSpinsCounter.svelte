<script lang="ts">
	import { Text, Rectangle } from 'pixi-svelte';
	import { stateBet } from 'state-shared';

	import { UI_BASE_SIZE } from '../constants';

	// Poseidon theme: navy disc, gold ring, cream numerals (was black/white)
	const NAVY = 0x241426;
	const GOLD = 0xff9440;
	const CREAM = 0xffd9ad;

	const fontSizeMultiplier = $derived.by(() => {
		if (stateBet.autoSpinsCounter === Infinity) return 3;
		if (stateBet.autoSpinsCounter > 99) return 1.5;
		if (stateBet.autoSpinsCounter > 9) return 2;
		return 2.5;
	});
</script>

{#if stateBet.autoSpinsCounter > 0}
	<Rectangle
		anchor={0.5}
		width={UI_BASE_SIZE * 0.9}
		height={UI_BASE_SIZE * 0.9}
		borderRadius={50}
		backgroundColor={NAVY}
		backgroundAlpha={0.92}
		borderColor={GOLD}
		borderWidth={3}
	/>
	<Text
		anchor={0.5}
		text={stateBet.autoSpinsCounter === Infinity ? '∞' : stateBet.autoSpinsCounter}
		style={{
			fontFamily: 'proxima-nova',
			fill: CREAM,
			fontWeight: 'bold',
			fontSize: fontSizeMultiplier * UI_BASE_SIZE * 0.2,
		}}
	/>
{/if}
