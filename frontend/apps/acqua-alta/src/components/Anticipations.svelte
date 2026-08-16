<script lang="ts">
	import { OnMount } from 'components-shared';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import Anticipation from './Anticipation.svelte';
	import { SFX } from '../game/soundMap';

	const context = getContext();
	const hasAnticipation = $derived(
		context.stateGame.board.some((reel) => reel.reelState.anticipating),
	);
</script>

{#if hasAnticipation}
	<OnMount
		onmount={() => {
			context.eventEmitter.broadcast({ type: 'soundLoop', name: SFX.anticipation });
			context.eventEmitter.broadcast({
				type: 'soundFade',
				name: SFX.anticipation,
				from: 0,
				to: 1,
				duration: SECOND,
			});

			return () => {
				context.eventEmitter.broadcast({ type: 'soundStop', name: SFX.anticipation });
			};
		}}
	/>
{/if}

{#each context.stateGame.board as reel}
	{#if reel.reelState.anticipating}
		<Anticipation {reel} oncomplete={() => (reel.reelState.anticipating = false)} />
	{/if}
{/each}
