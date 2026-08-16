<script lang="ts">
	import { stateBet, stateUi } from 'state-shared';
	import { getContext } from '../game/context';
	import { onMount } from 'svelte';

	const context = getContext();

	onMount(() => {
		// Replay approval gate: the book must NOT auto-play on load — playback is
		// started by the PLAY button in ReplayGate.svelte (startReplayPlayback).
		if (stateUi.config.mode === 'replay') return;

		if (stateBet.betToResume?.active && stateBet.betToResume.mode) {
			stateBet.activeBetModeKey = stateBet.betToResume.mode;
		}
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	});
</script>
