<script lang="ts">
	import { onMount } from 'svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	type Props = {
		oncomplete: () => void;
	};

	const props: Props = $props();

	// The blue water-surge transition was removed by request. This now renders
	// NOTHING and simply completes after a short beat, so the book-event
	// sequencing that awaits a transition stays intact — but there is no visual
	// wipe on free-spins / bonus transitions (or anywhere else).
	onMount(() => {
		let cancelled = false;
		(async () => {
			await waitForTimeout(120);
			if (!cancelled) props.oncomplete();
		})();
		return () => {
			cancelled = true;
		};
	});
</script>
