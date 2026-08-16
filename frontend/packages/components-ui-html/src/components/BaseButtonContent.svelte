<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div class="base-button-content">
	{@render props.children()}
</div>

<style lang="scss">
	.base-button-content {
		position: absolute;
		color: #ffd9ad;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
		font-weight: 700;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
