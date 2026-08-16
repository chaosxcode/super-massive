<script lang="ts">
	import { zIndex } from 'constants-shared/zIndex';

	import { getContext } from '../game/context';
	import {
		stateReplay,
		stateReplayDerived,
		startReplayPlayback,
		initReplay,
	} from '../game/stateReplay.svelte';

	// Start Replay gate (approval checklist, docs-research/topics/10-gap-fe-config.md):
	// - 'gate': game mode + play amount + cost multiplier + currency + REAL total
	//   cost, with a PLAY button that starts book playback (no auto-play).
	// - 'playing': a slim ribbon keeps the real cost visible during playback.
	// - 'finished': PLAY AGAIN replays the same book.
	// - 'error': replay data failed to load.
	// Wording is social-casino-safe (play amount / cost — no restricted words).
	const context = getContext();

	// replay completion = the resumeBet machine ran and the actor is idle again
	let sawResumeBetState = $state(false);
	$effect(() => {
		if (stateReplay.phase !== 'playing') {
			sawResumeBetState = false;
			return;
		}
		if (context.stateXstateDerived.isResumingBet()) {
			sawResumeBetState = true;
		} else if (sawResumeBetState && context.stateXstateDerived.isIdle()) {
			sawResumeBetState = false;
			stateReplay.phase = 'finished';
		}
	});

	// reviewer requirement: the mode name in Replay Mode must align with the
	// in-game feature terminology — use the feature title, raw key as fallback
	const costHeadline = $derived(
		`${stateReplayDerived.modeTitle() || stateReplayDerived.modeDisplayName()} ${stateReplayDerived.formatAmount(stateReplay.baseAmount)} — ${stateReplayDerived.formatAmount(stateReplayDerived.totalCost())} TOTAL`,
	);
</script>

{#if !context.stateLayout.showLoadingScreen}
	{#if stateReplay.phase === 'playing'}
		<div class="ribbon" style="--zIndex: {zIndex.modal - 10}" data-testid="replay-ribbon">
			REPLAY · {costHeadline}
		</div>
	{:else}
		<div class="backdrop" style="--zIndex: {zIndex.modal - 10}" data-testid="replay-gate">
			<div class="panel">
				<span class="kicker">ROUND REPLAY</span>

				{#if stateReplay.phase === 'loading'}
					<h2>LOADING…</h2>
					<p class="detail">Fetching the recorded round.</p>
				{:else if stateReplay.phase === 'error'}
					<h2 data-testid="replay-error">REPLAY UNAVAILABLE</h2>
					<p class="detail">
						The replay data could not be loaded. Please check the link and try again.
					</p>
					<button class="play" data-testid="replay-retry" onclick={() => initReplay()}>
						TRY AGAIN
					</button>
				{:else}
					{#if stateReplay.phase === 'finished'}
						<h2>REPLAY COMPLETE</h2>
						<p class="result" data-testid="replay-result">
							WIN {stateReplayDerived.formatWinAmount(stateReplayDerived.winAmount())}
							({stateReplayDerived.formatMultiplier(stateReplay.payoutMultiplier)})
						</p>
					{:else}
						<h2>{stateReplayDerived.modeTitle() || stateReplayDerived.modeDisplayName()}</h2>
					{/if}

					<p class="headline" data-testid="replay-cost">{costHeadline}</p>

					<dl>
						<div>
							<dt>GAME MODE</dt>
							<dd data-testid="replay-mode">
								{stateReplayDerived.modeTitle() || stateReplayDerived.modeDisplayName()}
							</dd>
						</div>
						<div>
							<dt>PLAY AMOUNT</dt>
							<dd data-testid="replay-base">
								{stateReplayDerived.formatAmount(stateReplay.baseAmount)}
							</dd>
						</div>
						<div>
							<!-- restricted-wording: "COST MULTIPLIER" -> "MULTIPLIER" (social-safe, currency-agnostic) -->
							<dt>MULTIPLIER</dt>
							<dd data-testid="replay-multiplier">{stateReplay.costMultiplier}×</dd>
						</div>
						<div>
							<!-- social mode (SC/GC): "currency" is restricted -> "TOKEN" (per Stake social word-swap) -->
							<dt>{(stateReplay.currency ?? '').match(/^X?(SC|GC)$/i) ? 'TOKEN' : 'CURRENCY'}</dt>
							<dd data-testid="replay-currency">{stateReplay.currency}</dd>
						</div>
						<div class="total">
							<!-- social mode (SC/GC) must not imply real money: "COST" -> "TOTAL PLAY" -->
							<dt>{(stateReplay.currency ?? '').match(/^X?(SC|GC)$/i) ? 'TOTAL PLAY' : 'REAL COST'}</dt>
							<dd data-testid="replay-total">
								{stateReplayDerived.formatAmount(stateReplayDerived.totalCost())}
							</dd>
						</div>
						<div>
							<!-- social mode (SC/GC): "PAYOUT" is a restricted money term -> Stake's
							     replay swap "Payout Multiplier" -> "Final Multiplier". Real currencies
							     keep "PAYOUT MULTIPLIER" (unflagged by the reviewer on the USD panel). -->
							<dt data-testid="replay-payout-multiplier-label">
								{(stateReplay.currency ?? '').match(/^X?(SC|GC)$/i)
									? 'FINAL MULTIPLIER'
									: 'PAYOUT MULTIPLIER'}
							</dt>
							<dd data-testid="replay-payout-multiplier">
								{stateReplayDerived.formatMultiplier(stateReplay.payoutMultiplier)}
							</dd>
						</div>
						<div class="total">
							<dt>TOTAL WIN</dt>
							<dd data-testid="replay-total-win">
								{stateReplayDerived.formatWinAmount(stateReplayDerived.winAmount())}
							</dd>
						</div>
					</dl>

					{#if stateReplay.phase === 'finished'}
						<button class="play" data-testid="replay-play-again" onclick={startReplayPlayback}>
							PLAY AGAIN
						</button>
					{:else}
						<button class="play" data-testid="replay-play" onclick={startReplayPlayback}>
							PLAY
						</button>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
{/if}

<style lang="scss">
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: var(--zIndex);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(4, 12, 22, 0.78);
		// extra "no path into normal play" defence: swallow pointer events to the canvas
		pointer-events: auto;
	}

	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		min-width: 18rem;
		max-width: 26rem;
		// the panel is ~389px tall — in the Popout S mini-player (225px viewport)
		// it must scroll rather than clip the heading and PLAY button off-screen
		max-height: 100%;
		box-sizing: border-box;
		overflow-y: auto;
		padding: 1.5rem 2rem;
		border-radius: 1rem;
		border: 2px solid #d4af37;
		background: linear-gradient(180deg, #102438 0%, #0b1b2a 100%);
		color: #f4ead2;
		text-align: center;
		box-shadow: 0 0 2rem rgba(0, 0, 0, 0.6);
	}

	.kicker {
		font-size: 0.75rem;
		letter-spacing: 0.3em;
		color: #8fb8c9;
	}

	h2 {
		margin: 0;
		font-size: 1.5rem;
		letter-spacing: 0.08em;
		color: #d4af37;
	}

	.headline {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.result {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: #7fd6a4;
	}

	.detail {
		margin: 0;
		font-size: 0.9rem;
		color: #c5d6de;
	}

	dl {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
		margin: 0;
		font-size: 0.85rem;

		div {
			display: flex;
			justify-content: space-between;
			gap: 2rem;
			padding: 0.15rem 0;
			border-bottom: 1px solid rgba(212, 175, 55, 0.2);

			&.total dd {
				color: #d4af37;
				font-weight: 700;
			}
		}

		dt {
			color: #8fb8c9;
			letter-spacing: 0.08em;
		}

		dd {
			margin: 0;
			font-weight: 600;
		}
	}

	.play {
		margin-top: 0.5rem;
		padding: 0.75rem 3rem;
		border: none;
		border-radius: 2rem;
		background: linear-gradient(180deg, #e8c763 0%, #b8901f 100%);
		color: #1a1206;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		cursor: pointer;

		&:hover {
			filter: brightness(1.1);
		}
	}

	// compact variant for very short viewports (Popout S): tighter paddings and
	// smaller type so the whole gate is reachable with minimal scrolling.
	// (Must come AFTER the base rules — same specificity, source order decides.)
	@media (max-height: 420px) {
		.panel {
			gap: 0.35rem;
			padding: 0.6rem 1rem;
		}
		.kicker {
			font-size: 0.65rem;
		}
		h2 {
			font-size: 1.05rem;
		}
		.headline {
			font-size: 0.85rem;
		}
		.result {
			font-size: 0.9rem;
		}
		dl {
			gap: 0.1rem;
			font-size: 0.72rem;
		}
		.play {
			margin-top: 0.25rem;
			padding: 0.45rem 2rem;
			font-size: 0.9rem;
		}
	}

	.ribbon {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: var(--zIndex);
		padding: 0.25rem 1.25rem;
		border-radius: 0 0 0.75rem 0.75rem;
		background: rgba(11, 27, 42, 0.85);
		border: 1px solid rgba(212, 175, 55, 0.5);
		border-top: none;
		color: #f4ead2;
		font-size: 0.8rem;
		letter-spacing: 0.1em;
		pointer-events: none;
	}
</style>
