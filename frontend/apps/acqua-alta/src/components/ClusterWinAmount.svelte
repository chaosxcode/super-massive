<script lang="ts" module>
	export type RawWin = {
		win: number;
		mult: number;
		result: number;
		reel: number; // 0 | 1 | 2 | 3 | 4 | 5;
		row: number; // 1 | 2 | 3 | 4 | 5; // excluding the off top row and the off bottom row
	};
	export type Win = RawWin & {
		displayX: number;
		maxWidth: number;
		oncomplete: () => void;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { Container } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { SECOND } from 'constants-shared/time';
	import { FadeContainer } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { SFX } from '../game/soundMap';

	type Props = { win: Win };

	const props: Props = $props();
	const context = getContext();
	const y = new Tween(0);
	const scale = new Tween(1);
	let show = $state(true);

	let showMultiplier = $state(props.win.mult > 1);

	// update showMultiplier
	onMount(async () => {
		await waitForTimeout(SECOND / stateBetDerived.timeScale());
		showMultiplier = false;
	});

	// update scale
	onMount(async () => {
		if (showMultiplier) {
			await waitForTimeout(SECOND);
			context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.clusterCombine });
			await scale.set(0.1, { duration: 200 / stateBetDerived.timeScale() });
			await scale.set(1, { duration: 200 / stateBetDerived.timeScale() });
		}
	});

	// update y
	onMount(async () => {
		// pacing: 2s float made every cascade drag — 0.9s reads fine at 140px cells
		await y.set(-SYMBOL_SIZE, { duration: 900 / stateBetDerived.timeScale() });
		show = false;
	});
</script>

<FadeContainer
	{show}
	oncomplete={() => {
		if (!show) props.win.oncomplete();
	}}
>
	<Container
		x={props.win.displayX}
		y={SYMBOL_SIZE * (props.win.row - 0.5) + y.current}
		scale={scale.current}
	>
		<ResponsiveBitmapText
			text={showMultiplier
				? `${bookEventAmountToCurrencyString(props.win.win)} X ${props.win.mult}`
				: bookEventAmountToCurrencyString(props.win.result)}
			anchor={0.5}
			maxWidth={props.win.maxWidth}
			style={{
				fontFamily: 'gold',
				fontSize: SYMBOL_SIZE * 0.5,
			}}
		/>
	</Container>
</FadeContainer>
