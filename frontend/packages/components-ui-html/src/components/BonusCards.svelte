<script lang="ts">
	import { stateBet, stateModal, type BetModeData } from 'state-shared';
	import { Button } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import BaseIcon from './BaseIcon.svelte';
	import BonusCard from './BonusCard.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { stateBonus } from '../stateBonus.svelte';
	import type { EmitterEventModal } from '../types';

	type Props = {
		list: BetModeData[];
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// asset base set by the app (works in dev AND under Stake's sub-path build)
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
	const ART: Record<string, string> = {
		ante: `${A}sprites/ui/buy-cards/dark_matter.webp`,
		wildshot: `${A}sprites/ui/buy-cards/three_wild_shot.webp`,
		bonus: `${A}sprites/ui/buy-cards/event_horizon.webp`,
		ejecta: `${A}sprites/ui/buy-cards/ejecta_reactor.webp`,
		superbonus: `${A}sprites/ui/buy-cards/singularity.webp`,
	};

	// clicking anywhere on a card opens the confirm window (same as the button).
	// The wave transition plays AFTER the player confirms (never before — a
	// pre-confirm animation reads as "the bonus was already purchased").
	// A short balance must NEVER fail silently (Stake rejection on two prior
	// games) — surface the same insufficient-funds message HudBar's spin uses.
	const confirmCard = (betModeData: BetModeData) => {
		if (
			stateBet.betAmount <= 0 ||
			stateBet.balanceAmount < stateBet.betAmount * betModeData.costMultiplier
		) {
			stateModal.modal = { name: 'betMessage', message: 'insufficientFunds' };
			return;
		}
		stateBonus.selectedBetModeKey = betModeData.mode;
		stateModal.modal = { name: 'buyBonusConfirm' };
		eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

{#each props.list as betModeData}
	{#if betModeData.type !== 'default'}
		<BonusCard onactivate={() => confirmCard(betModeData)}>
			{#snippet image()}
				{#if ART[betModeData.mode]}
					<img src={ART[betModeData.mode]} alt="" decoding="async" />
				{/if}
			{/snippet}

			{#snippet title()}
				<div class="title">
					{betModeData.text.title}
				</div>
			{/snippet}

			{#snippet description()}
				{#if betModeData?.text?.description}
					<div class="description">
						{betModeData.text.description}
					</div>
				{/if}
			{/snippet}

			{#snippet price()}
				<div class="price">
					{`${numberToCurrencyString(stateBet.betAmount * betModeData.costMultiplier)}`}
				</div>
			{/snippet}

			{#snippet button()}
				<Button onclick={() => confirmCard(betModeData)}>
					<BaseIcon
						width="100%"
						height="2rem"
						background="linear-gradient(180deg, #ffb45e, #f07f2e)"
						border="1px solid #ffd9ad"
					/>
					<BaseButtonContent>
						<span class="bonus-btn-label">{betModeData.text.button}</span>
					</BaseButtonContent>
				</Button>
			{/snippet}
		</BonusCard>
	{/if}
{/each}

<style lang="scss">
	.title {
		font-family:
			'proxima-nova',
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
		font-size: 1.2rem;
		line-height: 1.3rem;
		font-weight: 800;
		letter-spacing: 0;
		text-align: center;
		color: #36165d;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	.description {
		font-family:
			'proxima-nova',
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
		font-size: 0.92rem;
		line-height: 1.35;
		text-align: center;
		font-weight: 700;
		color: #173f58;
		min-height: 3.4rem;
		white-space: pre-line;
		display: inline-flex;
		align-items: center;
	}

	.description:empty {
		display: none;
	}

	.price {
		font-family:
			'proxima-nova',
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
		font-size: 1.25rem;
		line-height: 1.25rem;
		font-weight: 800;
		text-align: center;
		white-space: nowrap;
		color: #a91c75;
	}

	.bonus-btn-label {
		font-size: 1.6rem;
		font-weight: 800;
		letter-spacing: 0;
		color: #1b1420;
	}

	/* desktop / large: trim the forced description spacer + tighten type so all
	   three cards fit the window height without scrolling to reach PLAY */
	@media (min-width: 821px) and (orientation: landscape) {
		.title {
			font-size: 1.05rem;
			line-height: 1.15rem;
		}
		.description {
			min-height: 2.3rem;
			font-size: 0.85rem;
			line-height: 1.25;
		}
		.price {
			font-size: 1.1rem;
			line-height: 1.1rem;
		}
		.bonus-btn-label {
			font-size: 1.35rem;
		}
	}

	/* much bigger, centered text on mobile / portrait */
	@media (max-width: 820px), (orientation: portrait) {
		.title {
			font-size: 1.6rem;
			line-height: 1.7rem;
		}
		.description {
			font-size: 1.15rem;
			line-height: 1.45;
			min-height: 0;
		}
		.price {
			font-size: 1.7rem;
			line-height: 1.7rem;
		}
		.bonus-btn-label {
			font-size: 1.9rem;
		}
	}
</style>
