<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { initReplay } from '../game/stateReplay.svelte';

	// App-level replacement for components-shared/Authenticate.svelte when
	// ?replay=true: NO /wallet/authenticate (replay needs no session), and the
	// replay book is fetched but HELD at the ReplayGate instead of auto-playing.
	type Props = { children: Snippet };

	const props: Props = $props();

	let booted = $state(false);

	onMount(async () => {
		await initReplay();
		// render the game shell even when the replay fetch failed —
		// ReplayGate shows the error panel over it.
		booted = true;
	});
</script>

{#if booted}
	{@render props.children()}
{/if}
