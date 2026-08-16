<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		image?: Snippet;
		title: Snippet;
		description: Snippet;
		price: Snippet;
		button: Snippet;
		onactivate?: () => void;
	};

	const props: Props = $props();

	// the WHOLE card is clickable → confirm. Tap-detect so a drag-to-scroll
	// doesn't trigger it, and let the PLAY button handle its own clicks.
	let downX = 0;
	let downY = 0;
	const onDown = (e: PointerEvent) => {
		downX = e.clientX;
		downY = e.clientY;
	};
	const onUp = (e: PointerEvent) => {
		if (!props.onactivate) return;
		if (Math.hypot(e.clientX - downX, e.clientY - downY) > 10) return; // was a drag
		if ((e.target as HTMLElement)?.closest?.('button')) return; // PLAY button handles itself
		props.onactivate();
	};
</script>

<div
	class="bonus-card-wrap"
	role="button"
	tabindex="0"
	onpointerdown={onDown}
	onpointerup={onUp}
	onkeydown={(e) => e.key === 'Enter' && props.onactivate?.()}
>
	{#if props.image}
		<div class="card-art">{@render props.image()}</div>
	{/if}
	<div class="info">
		{@render props.title()}
		{@render props.description()}
		{@render props.price()}
	</div>
	{@render props.button()}
</div>

<style lang="scss">
	.bonus-card-wrap {
		padding: 0.65rem 0.65rem 0.75rem;
		flex-direction: column;
		display: flex;
		justify-content: space-between;
		align-items: center;

		border-radius: 8px;
		background: linear-gradient(180deg, #f4fdff 0%, #d8f7ff 58%, #fff0aa 100%);
		border: 3px solid #ffd34e;
		box-shadow:
			0 10px 24px rgba(3, 31, 65, 0.34),
			inset 0 0 0 2px rgba(255, 255, 255, 0.8),
			0 0 0 1px #9b5b14;
		text-align: center;
		min-width: 200px;
		max-width: 240px;
		gap: 0.65rem;
		cursor: pointer;
		outline: none;
	}

	.card-art {
		aspect-ratio: 3 / 4;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 3px 9px rgba(23, 63, 88, 0.3);
		width: 100%;
		background: #28cbea;
	}

	.card-art :global(img) {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5em;
		width: 100%;
	}

	/* desktop / large: scale each card to the window HEIGHT (art is 1.34:1 tall)
	   so all three + the bet toggle fit on screen without scrolling to PLAY */
	@media (min-width: 821px) and (orientation: landscape) {
		.bonus-card-wrap {
			max-width: min(240px, 27vh);
			padding: 0.6rem 0.65rem 0.75rem;
			gap: 0.45rem;
			border-width: 2px;
		}
		.info {
			gap: 0.35em;
		}
	}
</style>
