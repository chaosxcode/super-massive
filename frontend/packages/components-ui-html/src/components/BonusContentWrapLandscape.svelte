<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getContextLayout } from 'utils-layout';
	import { resizeObserver, type ContentRect } from 'utils-resize-observer';

	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';

	type Props = {
		maxListLength: number;
		betAmount: Snippet;
		bonusCardsActivate: Snippet;
		bonusCardsBuy: Snippet;
	};

	const props: Props = $props();

	const { stateLayoutDerived } = getContextLayout();

	let contentRect = $state({ width: 0, height: 0, left: 0, top: 0 } as ContentRect);

	// scale from the MEASURED content size (the transform doesn't affect the
	// observed layout rect, so there is no feedback loop) — the old fixed
	// 270-per-row benchmark overflowed tiny viewports like Stake's Popout S.
	const betAmountReserve = $derived(Math.min(250, stateLayoutDerived.canvasSizes().width * 0.34));
	const verticalScale = $derived(
		(stateLayoutDerived.canvasSizes().height * 0.94) / (contentRect?.height || 1),
	);
	const horizontalScale = $derived(
		(stateLayoutDerived.canvasSizes().width - betAmountReserve) / (contentRect?.width || 1),
	);
	const scale = $derived(Math.min(verticalScale, horizontalScale));

	// SMALL LANDSCAPE / POPOUT S: shrinking five cards to fit the width produced
	// ~63px cards with ~4px button text at 400x225 — the exact class of reject
	// Poseidon and Pride Blocks both got ("not scaled for the Popout S view" /
	// "not possible to purchase all three bonus modes"), and this game has FIVE
	// cards. Below, the cards keep a readable height-fitted size and the row
	// SCROLLS horizontally instead. transform: scale() does not affect layout,
	// so a sizer div carries the scaled dimensions to give the scroller real
	// extents.
	const small = $derived(
		stateLayoutDerived.canvasSizes().width <= 560 || stateLayoutDerived.canvasSizes().height <= 420,
	);
	let stripRect = $state({ width: 0, height: 0, left: 0, top: 0 } as ContentRect);
	const stripScale = $derived(
		Math.min(1, (stateLayoutDerived.canvasSizes().height * 0.86) / (stripRect?.height || 1)),
	);
</script>

<BaseContent maxWidth="100%" bare>
	{#if small}
		<!-- one readable, horizontally scrolling strip of all cards -->
		<div class="strip-outer">
			<div
				class="strip-sizer"
				style="width: {stripRect.width * stripScale}px; height: {stripRect.height * stripScale}px;"
			>
				<div
					class="strip"
					style="transform: scale({stripScale});"
					use:resizeObserver={(value) => (stripRect = value)}
				>
					{@render props.bonusCardsActivate()}
					{@render props.bonusCardsBuy()}
				</div>
			</div>
		</div>
		<div class="badge-amount-wrap badge-small">
			{@render props.betAmount()}
		</div>
	{:else}
		<div class="bonuses-wrap" use:resizeObserver={(value) => (contentRect = value)}>
			<div class="bonuses" style="transform: scale({Math.min(scale, 1)});">
				<BaseScrollable type="row" noScroll>
					{@render props.bonusCardsActivate()}
				</BaseScrollable>

				<BaseScrollable type="row" noScroll>
					{@render props.bonusCardsBuy()}
				</BaseScrollable>
			</div>
		</div>

		<div class="badge-amount-wrap">
			{@render props.betAmount()}
		</div>
	{/if}
</BaseContent>

<style lang="scss">
	.bonuses-wrap {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(calc(-50% - 7rem), -50%);
	}

	.bonuses {
		display: flex;
		flex-direction: column;
		gap: 1rem;

		transform-origin: center center;
	}

	.badge-amount-wrap {
		position: fixed;
		top: calc(50% + 1.2rem);
		right: 1rem;
		transform: translateY(-50%);
	}

	/* small landscape / popout: full-width scroll strip, badge overlaid right */
	.strip-outer {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		overflow-x: auto;
		overflow-y: hidden;
		/* room to scroll the last card clear of the fixed badge */
		padding: 0 190px 0 12px;
		scrollbar-width: thin;
	}
	.strip-sizer {
		flex: 0 0 auto;
	}
	.strip {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 1rem;
		width: max-content;
		transform-origin: top left;
	}
	.badge-small {
		transform: translateY(-50%) scale(0.8);
		transform-origin: right center;
		z-index: 3;
	}
</style>
