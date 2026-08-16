<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  };
</script>

<script lang="ts">
	import _ from 'lodash';

	import { waitForResolve } from 'utils-shared/wait';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';

	const context = getContext();

	let show = $state(true);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			// A position can sit in SEVERAL clusters at once (a gondola wild W shared
			// by two clusters — wincap book id 1413 event 34). Without dedupe the
			// duplicated promise overwrites `reelSymbol.oncomplete`, the first
			// resolver is lost and Promise.all never settles → game freezes.
			const uniquePositions = _.uniqBy(symbolPositions, (p) => `${p.reel}-${p.row}`);
			const getPromises = () =>
				uniquePositions.map(async (position) => {
					const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
					// bind oncomplete BEFORE the 'win' state + a safety timeout, so a lost
					// callback (state overwritten / unmount) can never freeze the round
					await waitForResolve((resolve) => {
						let settled = false;
						const done = () => {
							if (settled) return;
							settled = true;
							resolve();
						};
						reelSymbol.oncomplete = done;
						reelSymbol.symbolState = 'win';
						setTimeout(done, 2000);
					});
					reelSymbol.symbolState = 'postWinStatic';
				});

			await Promise.all(getPromises());
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
