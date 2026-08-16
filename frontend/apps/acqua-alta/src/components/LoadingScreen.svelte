<script lang="ts">
	import { Container, Sprite, Rectangle } from 'pixi-svelte';
	import { LoadingProgress } from 'components-pixi';
	import { CanvasSizeRectangle } from 'components-layout';

	import { getContext } from '../game/context';

	type Props = {
		active?: boolean;
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const portrait = $derived(canvas.height > canvas.width);
	const sceneRatio = $derived(portrait ? 720 / 1280 : 1664 / 936);
	const coverW = $derived(Math.max(canvas.width, canvas.height * sceneRatio));
	const coverH = $derived(coverW / sceneRatio);
	const progressWidth = $derived(
		Math.min(portrait ? 500 : 420, Math.max(230, canvas.width * 0.52)),
	);
	const progressY = $derived(canvas.height - Math.max(38, canvas.height * 0.055));
	const MIN_VISIBLE_MS = 1100;
	let activationStarted = $state(false);
	let activatedAt = 0;

	$effect(() => {
		if ((props.active ?? true) && !activationStarted) {
			activationStarted = true;
			activatedAt = Date.now();
		}
	});

	// auto-advance into the intro splash once loaded. Hand off DIRECTLY — the splash
	// mounts with an instant opaque blur backdrop that covers the swap, so there's
	// no blue water-surge (and no flash) between the loader and the cards splash.
	$effect(() => {
		if ((props.active ?? true) && context.stateApp.loaded) {
			const visibleFor = activationStarted ? Date.now() - activatedAt : 0;
			const t = setTimeout(() => props.onloaded(), Math.max(120, MIN_VISIBLE_MS - visibleFor));
			return () => clearTimeout(t);
		}
	});
</script>

<!-- A single opaque illustration covers the live scene completely. The exact
	wordmark is baked into each plate, so no second screenshot or pulsing logo can
	drift over it during startup. -->
<Container>
	<CanvasSizeRectangle backgroundColor={0x02030a} backgroundAlpha={1} />
	<Container x={canvas.width * 0.5} y={canvas.height * 0.5}>
		<Sprite
			key={portrait ? 'loading_supermassive_portrait' : 'loading_supermassive'}
			anchor={0.5}
			width={coverW}
			height={coverH}
		/>
	</Container>
	<Container x={canvas.width * 0.5} y={progressY}>
		<LoadingProgress width={progressWidth} height={18}>
			{#snippet background(sizes)}
				<Rectangle {...sizes} borderRadius={9} backgroundColor={0x050714} backgroundAlpha={0.92} />
			{/snippet}
			{#snippet progress(sizes)}
				<Rectangle {...sizes} borderRadius={8} backgroundColor={0x35d3e5} />
			{/snippet}
			{#snippet frame(sizes)}
				<Rectangle
					{...sizes}
					borderRadius={9}
					backgroundColor={0x000000}
					backgroundAlpha={0}
					borderColor={0xf2c94c}
					borderWidth={2}
				/>
			{/snippet}
		</LoadingProgress>
	</Container>
</Container>
