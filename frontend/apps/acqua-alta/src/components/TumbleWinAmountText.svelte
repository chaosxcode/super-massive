<script lang="ts">
	import { untrack } from 'svelte';
	import { cubicOut, backOut } from 'svelte/easing';

	import { Container } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { SYMBOL_SIZE } from '../game/constants';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';

	type Props = {
		width: number;
		amount: number;
		animate: boolean;
		oncomplete: () => void;
	};

	const props: Props = $props();

	let displayAmount = $state(0);
	let scale = $state(1);
	let token: TweenToken = createTweenToken();

	const run = async () => {
		token.cancelled = true;
		token = createTweenToken();
		const t = token;

		if (props.animate) {
			// stand-in for the spine 'explosion' beat: pop the amount
			await tween({ from: 1, to: 1.3, duration: 160, easing: cubicOut, onUpdate: (v) => (scale = v), token: t }); // prettier-ignore
			tween({ from: 1.3, to: 1, duration: 260, easing: backOut, onUpdate: (v) => (scale = v), token: t }); // prettier-ignore
		}

		await tween({
			from: displayAmount,
			to: props.amount,
			duration: 300,
			easing: cubicOut,
			onUpdate: (v) => (displayAmount = v),
			token: t,
		});
		props.oncomplete();
	};

	$effect(() => {
		props.amount;
		props.animate;
		untrack(() => run());
	});
</script>

<Container scale={scale}>
	<ResponsiveBitmapText
		anchor={0.5}
		style={{
			fontFamily: 'gold',
			fontSize: 0.65 * SYMBOL_SIZE,
		}}
		text={bookEventAmountToCurrencyString(displayAmount)}
		maxWidth={props.width}
	/>
</Container>
