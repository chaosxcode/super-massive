<script lang="ts" module>
	import ClusterWinAmount, { type RawWin, type Win } from './ClusterWinAmount.svelte';

	export type EmitterEventClusterWinAmounts = {
		type: 'showClusterWinAmounts';
		wins: RawWin[];
	};
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';

	const context = getContext();

	let wins: Win[] = $state([]);

	// Server overlay anchors identify each winning cluster, but two nearby clusters
	// can legally return the same/adjacent cells. Raw placement lets their amount
	// strings paint on top of each other. For a multi-win event, order the labels by
	// their source cluster and give each a non-overlapping horizontal lane. A single
	// label remains near its server anchor but is clamped fully inside the board.
	const arrangeWins = (rawWins: RawWin[]): Omit<Win, 'oncomplete'>[] => {
		const ordered = [...rawWins].sort((a, b) => a.reel - b.reel || a.row - b.row);
		const count = ordered.length;
		const edgeInset = SYMBOL_SIZE * 0.12;

		if (count === 1) {
			const maxWidth = Math.min(SYMBOL_SIZE * 2.8, BOARD_SIZES.width - edgeInset * 2);
			const halfWidth = maxWidth / 2;
			const desiredX = SYMBOL_SIZE * (ordered[0].reel + 0.5);
			return [
				{
					...ordered[0],
					displayX: Math.min(
						BOARD_SIZES.width - edgeInset - halfWidth,
						Math.max(edgeInset + halfWidth, desiredX),
					),
					maxWidth,
				},
			];
		}

		const laneWidth = BOARD_SIZES.width / count;
		return ordered.map((win, index) => ({
			...win,
			displayX: laneWidth * (index + 0.5),
			maxWidth: laneWidth * 0.88,
		}));
	};

	context.eventEmitter.subscribeOnMount({
		showClusterWinAmounts: async (emitterEvent) => {
			wins = arrangeWins(emitterEvent.wins).map((win) => ({ ...win, oncomplete: () => {} }));
			const gerPromises = () =>
				wins.map(async (win) => {
					await waitForResolve((resolve) => {
						let settled = false;
						const done = () => {
							if (settled) return;
							settled = true;
							resolve();
						};
						win.oncomplete = done;
						setTimeout(done, 2500); // safety: never deadlock if the fade's oncomplete is lost
					});
				});
			await Promise.all(gerPromises());
			wins = [];
		},
	});
</script>

<BoardContainer>
	{#each wins as win}
		<ClusterWinAmount {win} />
	{/each}
</BoardContainer>
