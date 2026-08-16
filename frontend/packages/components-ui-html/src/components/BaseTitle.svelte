<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div class="ui-modal-title-wrap">
	{@render props.children()}
</div>

<style lang="scss">
	.ui-modal-title-wrap {
		text-align: center;
		font-family: 'proxima-nova', -apple-system, 'Segoe UI', Roboto, sans-serif;
		font-weight: 800;
		/* scale with the viewport so it isn't huge in Stake's small 400x225 popup;
		   px floors because the html root font halves under 500px (Modals.svelte) —
		   rem-only bounds rendered titles at 10.4px on phones (review finding) */
		font-size: clamp(max(0.85rem, 13px), 4vw, max(1.3rem, 16px));
		letter-spacing: 0.05em;
		color: #ffb45e;
		text-shadow:
			0 2px 0 #1b1420,
			0 0 18px rgba(196, 64, 143, 0.5);
	}
</style>
