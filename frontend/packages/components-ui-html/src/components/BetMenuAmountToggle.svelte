<script lang="ts">
	import { stateBet, stateConfig } from 'state-shared';
	import { Button, OptionsToggle } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import type { EmitterEventModal } from '../types';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();
</script>

<OptionsToggle
	value={stateBet.betAmount}
	options={stateConfig.betAmountOptions}
	onchange={(value) => {
		stateBet.betAmount = value;
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	}}
>
	{#snippet children({ disabledDown, disabledUp, toggleDown, toggleUp })}
		<div class="toggle-wrap">
			<Button data-test="down-button" disabled={disabledDown} onclick={toggleDown}>
				<span class="pm" class:dim={disabledDown}>&minus;</span>
			</Button>

			<span class="amount">{numberToCurrencyString(stateBet.betAmount)}</span>

			<Button data-test="up-button" disabled={disabledUp} onclick={toggleUp}>
				<span class="pm" class:dim={disabledUp}>+</span>
			</Button>
		</div>
	{/snippet}
</OptionsToggle>

<style lang="scss">
	.toggle-wrap {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 1.4rem;
		padding: 0.45rem 1.6rem;
		border-radius: 18px;
		/* slight dark-blue gradient backing, no black circles behind the +/- */
		background: linear-gradient(180deg, rgba(12, 46, 67, 0.85), rgba(6, 24, 37, 0.92));
		border: 1px solid rgba(255, 148, 64, 0.35);
		box-shadow: inset 0 0 22px rgba(196, 64, 143, 0.1);
	}
	.pm {
		font-family: 'proxima-nova', -apple-system, 'Segoe UI', Roboto, sans-serif;
		font-weight: 900;
		font-size: 3.6rem;
		line-height: 1;
		color: #ffd9ad;
		text-shadow: 0 2px 0 #1b1420;
		padding: 0 0.4rem;
	}
	.pm.dim {
		opacity: 0.35;
	}
	.amount {
		font-family: 'proxima-nova', -apple-system, 'Segoe UI', Roboto, sans-serif;
		font-weight: 800;
		font-size: 1.75rem;
		color: #ffd9ad;
		min-width: 7rem;
		text-align: center;
		text-shadow: 0 2px 5px rgba(0, 0, 0, 0.55);
	}
</style>
