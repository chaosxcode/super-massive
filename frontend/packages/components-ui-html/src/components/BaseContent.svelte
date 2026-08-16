<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		maxWidth: '100%' | '500px';
		children: Snippet;
		bare?: boolean;
	};

	const props: Props = $props();
</script>

<div
	class="ui-popup-standard-content-wrap"
	class:bare={props.bare}
	style="--maxWidth: {props.maxWidth}; --zIndex: {100}"
>
	{@render props.children()}
</div>

<style lang="scss">
	.ui-popup-standard-content-wrap {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: var(--zIndex);
		max-width: var(--maxWidth);
		max-height: 86vh;
		gap: 1rem;
		box-sizing: border-box;
		padding: 1.5rem 1.6rem;
		color: #f4ead9;
		background: linear-gradient(180deg, rgba(43, 22, 54, 0.97), rgba(19, 10, 27, 0.98));
		border: 2px solid #ff9440;
		border-radius: 18px;
		box-shadow:
			0 12px 42px rgba(0, 0, 0, 0.55),
			inset 0 0 30px rgba(196, 64, 143, 0.08);
	}

	/* bonus-buy selection: no panel, just the cards floating */
	.ui-popup-standard-content-wrap.bare {
		background: none;
		border: none;
		box-shadow: none;
		padding: 0;
	}
</style>
