<script lang="ts">
	import { onMount } from 'svelte';
	import { sineInOut, cubicOut } from 'svelte/easing';
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_PADDING, SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import { tween, createTweenToken } from '../game/tween';

	type Props = {
		reel: Reel;
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// programmatic stand-in for the spine anticipation column:
	// amber column glow breathing over the slow-dropping reel
	let alpha = $state(0);
	let stopped = $state(false);

	const token = createTweenToken();

	onMount(() => {
		(async () => {
			await tween({ from: 0, to: 0.32, duration: 300, easing: cubicOut, onUpdate: (v) => (alpha = v), token }); // prettier-ignore
			while (!token.cancelled) {
				await tween({ from: 0.32, to: 0.14, duration: 450, easing: sineInOut, onUpdate: (v) => (alpha = v), token }); // prettier-ignore
				await tween({ from: 0.14, to: 0.32, duration: 450, easing: sineInOut, onUpdate: (v) => (alpha = v), token }); // prettier-ignore
			}
		})();

		return () => (token.cancelled = true);
	});

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped' && !stopped) {
			stopped = true;
			(async () => {
				token.cancelled = true;
				await tween({ from: alpha, to: 0, duration: 250, easing: cubicOut, onUpdate: (v) => (alpha = v) }); // prettier-ignore
				props.oncomplete();
			})();
		}
	});
</script>

<Rectangle
	anchor={0.5}
	x={context.stateGameDerived.boardLayout().x -
		context.stateGameDerived.boardLayout().width * 0.5 +
		(props.reel.reelIndex + REEL_PADDING) * SYMBOL_SIZE}
	y={context.stateGameDerived.boardLayout().y}
	width={SYMBOL_SIZE * 0.92}
	height={SYMBOL_SIZE * BOARD_DIMENSIONS.y}
	borderRadius={12}
	backgroundColor={0xf07f2e}
	{alpha}
/>
