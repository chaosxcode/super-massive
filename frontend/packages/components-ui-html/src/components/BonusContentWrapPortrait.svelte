<script lang="ts">
	import type { Snippet } from 'svelte';

	import BaseContent from './BaseContent.svelte';

	type Props = {
		maxListLength: number;
		betAmount: Snippet;
		bonusCardsActivate: Snippet;
		bonusCardsBuy: Snippet;
	};

	const props: Props = $props();

	let scroller = $state<HTMLDivElement>();
	let atBottom = $state(false);

	const refresh = () => {
		const el = scroller;
		if (!el) return;
		atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
	};
	$effect(() => {
		if (scroller) refresh();
	});

	// click-and-drag to scroll with the mouse (native touch-drag already works)
	let dragging = false;
	let startY = 0;
	let startTop = 0;
	const onPointerDown = (e: PointerEvent) => {
		if (!scroller) return;
		dragging = true;
		startY = e.clientY;
		startTop = scroller.scrollTop;
	};
	const onPointerMove = (e: PointerEvent) => {
		if (!dragging || !scroller) return;
		scroller.scrollTop = startTop - (e.clientY - startY);
	};
	const endDrag = () => (dragging = false);

	// keyboard: up/down arrows + spacebar scroll the list (spacebar is stopped from
	// bubbling so it doesn't also trigger the spin hotkey while the menu is open)
	const onKeyDown = (e: KeyboardEvent) => {
		if (!scroller) return;
		const step = 80;
		if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
			scroller.scrollTop += step;
			e.preventDefault();
			e.stopPropagation();
		} else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
			scroller.scrollTop -= step;
			e.preventDefault();
			e.stopPropagation();
		}
	};
</script>

<BaseContent maxWidth="100%" bare>
	<div class="portrait-wrap">
		{@render props.betAmount()}

		<div class="vscroll-wrap">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="vscroll"
				class:dragging
				bind:this={scroller}
				tabindex="0"
				role="group"
				aria-label="Bonus options — drag, scroll, or use arrow keys"
				onscroll={refresh}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={endDrag}
				onpointerleave={endDrag}
				onkeydown={onKeyDown}
			>
				{@render props.bonusCardsActivate()}
				{@render props.bonusCardsBuy()}
			</div>

			{#if !atBottom}
				<div class="scroll-down" aria-hidden="true"><span class="chev"></span></div>
			{/if}
		</div>
	</div>
</BaseContent>

<style lang="scss">
	.portrait-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.vscroll-wrap {
		position: relative;
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.vscroll {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-height: 64vh;
		overflow-y: auto;
		padding: 0.25rem 0.5rem 0.5rem;
		cursor: grab;
		outline: none;
		scrollbar-width: thin;
		scrollbar-color: #ff9440 rgba(0, 0, 0, 0.2);
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
	}
	.vscroll.dragging {
		cursor: grabbing;
		scroll-behavior: auto;
		user-select: none;
	}
	.vscroll::-webkit-scrollbar {
		width: 7px;
	}
	.vscroll::-webkit-scrollbar-thumb {
		background: #ff9440;
		border-radius: 7px;
	}

	/* full-width readable cards in the vertical list; the vh term only bites on
	   SHORT viewports (Popout S) so one card never dwarfs the whole window */
	.vscroll :global(.bonus-card-wrap) {
		width: min(82vw, 320px, 48vh);
		max-width: min(82vw, 320px, 48vh);
		min-width: 0;
		box-sizing: border-box;
	}

	/* bouncing "scroll down" chevron */
	.scroll-down {
		position: absolute;
		bottom: 2px;
		left: 50%;
		transform: translateX(-50%);
		pointer-events: none;
		animation: bob 1.1s ease-in-out infinite;
		filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.7));
	}
	.chev {
		display: block;
		width: 30px;
		height: 30px;
		border-right: 6px solid #ffffff;
		border-bottom: 6px solid #ffffff;
		transform: rotate(45deg);
	}
	@keyframes bob {
		0%,
		100% {
			transform: translate(-50%, 0);
		}
		50% {
			transform: translate(-50%, 7px);
		}
	}
</style>
