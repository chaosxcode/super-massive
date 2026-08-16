<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	type AddingBoard = RawSymbol[][];
	type ExplodingPositions = Position[];

	export type EmitterEventTumbleBoard =
		| { type: 'tumbleBoardShow' }
		| { type: 'tumbleBoardHide' }
		| { type: 'tumbleBoardInit'; addingBoard: AddingBoard }
		| { type: 'tumbleBoardReset' }
		| { type: 'tumbleBoardExplode'; explodingPositions: ExplodingPositions }
		| { type: 'tumbleBoardRemoveExploded' }
		| { type: 'tumbleBoardSlideDown'; step?: number };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { Tween } from 'svelte/motion';
	import { cubicIn, cubicOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import { getSymbolY } from '../game/utils';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { tween } from '../game/tween';

	const context = getContext();

	let show = $state(false);

	const createTumbleSymbol = ({ initY, rawSymbol }: { initY: number; rawSymbol: RawSymbol }) => {
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const tumbleSymbol = $state({
			symbolY,
			rawSymbol,
			symbolState: 'static' as const,
			oncomplete,
			fallX: 0,
			fallRotation: 0,
			fallScaleX: 1,
			fallScaleY: 1,
		});

		return tumbleSymbol;
	};

	const initTumbleBoardAdding = ({ addingBoard }: { addingBoard: AddingBoard }) => {
		return context.stateGameDerived.boardRaw().map((_, reelIndex) => {
			const addingReel = addingBoard[reelIndex] ?? [];

			const tumbleReelAdding = addingReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1 - addingReel.length);
				return createTumbleSymbol({ initY, rawSymbol });
			});

			return tumbleReelAdding;
		});
	};

	const initTumbleBoardBase = () => {
		return context.stateGameDerived.boardRaw().map((rawSymbolReel) => {
			const tumbleReelBase = rawSymbolReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1);
				return createTumbleSymbol({ initY, rawSymbol });
			});

			return tumbleReelBase;
		});
	};

	context.eventEmitter.subscribeOnMount({
		tumbleBoardShow: () => (show = true),
		tumbleBoardHide: () => (show = false),
		tumbleBoardInit: ({ addingBoard }) => {
			context.stateGame.tumbleBoardAdding = initTumbleBoardAdding({ addingBoard });
			context.stateGame.tumbleBoardBase = initTumbleBoardBase();
		},
		tumbleBoardReset: () => {
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = [];
		},
		tumbleBoardExplode: async ({ explodingPositions }) => {
			// Same dedupe as Board.svelte boardWithAnimateSymbols: a shared wild's
			// position appears once per overlapping cluster in the math's
			// explodingSymbols; the duplicate would overwrite `oncomplete` and hang.
			const uniquePositions = _.uniqBy(explodingPositions, (p) => `${p.reel}-${p.row}`);
			const getPromises = () =>
				uniquePositions.map(async (position) => {
					const tumbleSymbol = context.stateGame.tumbleBoardBase[position.reel][position.row];
					// bind oncomplete BEFORE 'explosion' + safety timeout: a filtered/unmounted
					// symbol whose oncomplete never fires must not freeze the whole cascade
					await waitForResolve((resolve) => {
						let settled = false;
						const done = () => {
							if (settled) return;
							settled = true;
							resolve();
						};
						tumbleSymbol.oncomplete = done;
						tumbleSymbol.symbolState = 'explosion';
						setTimeout(done, 1500);
					});
				});

			await Promise.all(getPromises());
		},
		tumbleBoardRemoveExploded: () => {
			context.stateGame.tumbleBoardBase.forEach((tumbleReel, reelIndex) => {
				context.stateGame.tumbleBoardBase[reelIndex] = tumbleReel.filter(
					(tumbleSymbol) => tumbleSymbol.symbolState !== 'explosion',
				);
			});
		},
		tumbleBoardSlideDown: async ({ step }) => {
			// Distance-aware gravity with a restrained waterfall release. Deep
			// cascades tighten, but the floor keeps long drops readable.
			const cascadeTempo = Math.max(0.68, Math.pow(0.9, step ?? 0));
			const getPromises = () =>
				_.flatten(
					context.stateGameDerived.tumbleBoardCombined().map((tumbleReel, reelIndex) => {
						return tumbleReel.map(async (tumbleSymbol, symbolIndex) => {
							const targetY = getSymbolY(symbolIndex - 1); // Refer to initTumbleBoardBase
							if (targetY !== tumbleSymbol.symbolY.current) {
								const startY = tumbleSymbol.symbolY.current;
								const rows = Math.max(1, Math.abs(targetY - startY) / SYMBOL_SIZE);
								const fallDuration = Math.round((210 + Math.min(260, rows * 58)) * cascadeTempo);
								const releaseDelay = Math.round(
									(reelIndex * 24 + Math.max(0, tumbleReel.length - 1 - symbolIndex) * 7) *
										cascadeTempo,
								);
								const direction = (reelIndex + symbolIndex) % 2 === 0 ? 1 : -1;
								const drift = Math.min(18, 7 + rows * 2.2);
								const impactY = targetY + Math.min(16, 7 + rows * 2);

								await waitForTimeout(releaseDelay);
								tumbleSymbol.symbolState = 'spin';
								await Promise.all([
									tumbleSymbol.symbolY.set(impactY, {
										duration: fallDuration,
										easing: cubicIn,
									}),
									tween({
										from: 0,
										to: 1,
										duration: fallDuration,
										onUpdate: (p) => {
											const envelope = Math.sin(p * Math.PI);
											const wobble = Math.sin(p * Math.PI * (1.7 + rows * 0.12) + reelIndex * 0.8);
											tumbleSymbol.fallX =
												direction * (drift * envelope * (0.62 + wobble * 0.38) + p * 2.2);
											tumbleSymbol.fallRotation =
												direction * (0.035 + rows * 0.009) * (envelope * 0.72 + p * 0.35);
											tumbleSymbol.fallScaleX = 1 - Math.sin(p * Math.PI * 0.5) * 0.055;
											tumbleSymbol.fallScaleY = 1 + Math.sin(p * Math.PI * 0.5) * 0.09;
										},
									}),
								]);

								if (symbolIndex > 0 && symbolIndex < tumbleReel.length - 1) {
									// Bind oncomplete BEFORE switching to 'land' so the land
									// animation can never finish before we're listening — that race
									// (and shared-wild symbols whose oncomplete gets overwritten)
									// deadlocked the whole book-event sequence, which silently
									// stalled every event queued AFTER the cascade: the tideLevel
									// gauge/water rise, further cascades, etc. The safety timeout
									// guarantees the chain can never hang even if oncomplete is lost.
									const settleDuration = Math.max(110, Math.round(165 * cascadeTempo));
									const startX = tumbleSymbol.fallX;
									const startRotation = tumbleSymbol.fallRotation;
									const startScaleX = tumbleSymbol.fallScaleX;
									const startScaleY = tumbleSymbol.fallScaleY;
									const landAnimation = waitForResolve((resolve) => {
										let settled = false;
										const done = () => {
											if (settled) return;
											settled = true;
											tumbleSymbol.symbolState = 'static';
											resolve();
										};
										tumbleSymbol.oncomplete = done;
										tumbleSymbol.symbolState = 'land';
										context.stateGameDerived.onSymbolLand({ rawSymbol: tumbleSymbol.rawSymbol });
										setTimeout(done, 560);
									});
									await Promise.all([
										landAnimation,
										tumbleSymbol.symbolY.set(targetY, {
											duration: settleDuration,
											easing: cubicOut,
										}),
										tween({
											from: 0,
											to: 1,
											duration: settleDuration,
											easing: cubicOut,
											onUpdate: (p) => {
												tumbleSymbol.fallX =
													startX * (1 - p) + direction * Math.sin(p * Math.PI) * 2.4;
												tumbleSymbol.fallRotation =
													startRotation * (1 - p) - direction * Math.sin(p * Math.PI) * 0.025;
												tumbleSymbol.fallScaleX = startScaleX + (1 - startScaleX) * p;
												tumbleSymbol.fallScaleY = startScaleY + (1 - startScaleY) * p;
											},
										}),
									]);
								} else {
									await tumbleSymbol.symbolY.set(targetY, {
										duration: Math.max(90, Math.round(130 * cascadeTempo)),
										easing: cubicOut,
									});
									tumbleSymbol.fallX = 0;
									tumbleSymbol.fallRotation = 0;
									tumbleSymbol.fallScaleX = 1;
									tumbleSymbol.fallScaleY = 1;
									tumbleSymbol.symbolState = 'static';
								}
							}
						});
					}),
				);

			await Promise.all(getPromises());
		},
	});
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
