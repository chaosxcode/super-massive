<script lang="ts">
	import { Button, Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateBet, stateModal, stateUi, INFINITY_MARK } from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';

	import BaseIcon from './BaseIcon.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import BaseButtonWrap from './BaseButtonWrap.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { stateBonus, stateBonusDerived } from '../stateBonus.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// ornate generated plaque banner per bonus (rope frame, themed center)
	const PLAQUE: Record<string, string> = {
		ante: 'buy_plaque_storm',
		wildshot: 'buy_plaque_storm',
		bonus: 'buy_plaque_tide',
		ejecta: 'buy_plaque_tide',
		superbonus: 'buy_plaque_wrath',
	};
	// asset base set by the app (works in dev AND under Stake's sub-path build)
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
	const plaqueUrl = $derived(
		`${A}sprites/ui/${PLAQUE[stateBonusDerived.selectedBetModeData().mode] ?? 'buy_plaque_wrath'}.webp`,
	);

	const confirm = () => {
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;

		if (stateBonusDerived.selectedBetModeData().type === 'buy') {
			// the purchase is confirmed NOW — the wave washes over the game while
			// the bought bonus loads/reveals behind it
			eventEmitter.broadcast({ type: 'bonusWave' });
			eventEmitter.broadcast({ type: 'bet' });
		}

		if (stateBonusDerived.selectedBetModeData().type === 'activate') {
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		}
	};
</script>

{#if stateModal.modal?.name === 'buyBonusConfirm'}
	<Popup zIndex={zIndex.dialog} onclose={() => (stateModal.modal = { name: 'buyBonus' })}>
		<BaseContent maxWidth="500px" bare>
			<div
				class="confirm-plaque"
				class:deep-crest={stateBonusDerived.selectedBetModeData().mode === 'bonus'}
				style="background-image: url({plaqueUrl});"
			>
				<div class="confirm-inner">
					<BaseTitle>
						<span class="ct">{stateBonusDerived.selectedBetModeData().text.title}</span>
					</BaseTitle>
					<BaseScrollable type="column">
						<div class="cb">{stateBonusDerived.selectedBetModeData().text.dialog}</div>
					</BaseScrollable>
					<BaseButtonWrap type="max-width">
						<Button
							data-test="confirm-button"
							onclick={() => {
								confirm();
								eventEmitter.broadcast({ type: 'soundPressGeneral' });
								stateModal.modal = null;
							}}
						>
							<BaseIcon width="100%" height="2.6rem" />
							<BaseButtonContent>
								<span class="cbtn">{i18nDerived.confirm()}</span>
							</BaseButtonContent>
						</Button>
					</BaseButtonWrap>
				</div>
			</div>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.confirm-plaque {
		/* fixed plate aspect (v4 plaques are ~2:1) so the art never distorts;
		   content is pinned into the plates' recessed window below */
		position: relative;
		width: min(94vw, 640px);
		aspect-ratio: 2 / 1;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
	}
	.confirm-inner {
		/* storm/wrath plates are dark nearly edge to edge — generous window;
		   the tide plate's sculpted crest eats the top third (.deep-crest) */
		position: absolute;
		inset: 19% 13% 12%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		min-height: 0;
	}
	.deep-crest .confirm-inner {
		inset: 31% 13% 12%;
	}
	.ct {
		/* dark gradient backdrop so the title pops off the ornate crest art */
		display: inline-block;
		padding: 0.12em 1.1em 0.16em;
		border-radius: 1.2em;
		background: radial-gradient(
			ellipse at center,
			rgba(10, 5, 14, 0.94) 0%,
			rgba(10, 5, 14, 0.7) 55%,
			rgba(10, 5, 14, 0) 100%
		);
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		color: #ffb45e;
		text-shadow:
			0 2px 4px rgba(0, 0, 0, 0.9),
			0 2px 0 #1b1420,
			0 0 18px rgba(196, 64, 143, 0.55);
	}
	.cb {
		font-size: 0.98rem;
		line-height: 1.4;
		text-align: center;
		color: #f4ead9;
		text-shadow:
			0 1px 3px rgba(0, 0, 0, 0.95),
			0 0 8px rgba(0, 0, 0, 0.8);
		/* soft dark plate behind the description so it reads over ornate art */
		background: rgba(10, 5, 14, 0.55);
		border-radius: 0.8em;
		padding: 0.45em 0.8em;
	}
	.cbtn {
		font-size: 1.4rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: #ffd9ad;
	}
</style>
