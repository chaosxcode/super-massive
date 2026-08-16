<script lang="ts">
	import type { Snippet } from 'svelte';

	// Story-only helper: runs the replay URL/fetch stubbing during component init
	// (writes to shared state are forbidden inside template expressions like
	// {@const}, so the setup cannot be invoked from the snippet directly).
	// Children (ReplayAuthenticate → Game) mount AFTER this script has run.
	type Props = { setup: () => void; children: Snippet };

	const props: Props = $props();

	props.setup();
</script>

{@render props.children()}
