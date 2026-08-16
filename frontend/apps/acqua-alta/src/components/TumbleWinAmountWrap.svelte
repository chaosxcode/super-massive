<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { FRAME_SIZES, SYMBOL_SIZE } from '../game/constants';
	import BoardContainer from './BoardContainer.svelte';

	type Props = {
		show: boolean;
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	// TumbleWinAmountFrame's plate, in board units — needed here because the
	// free-spins placement is edge-derived, not centre-derived.
	const PANEL_W = SYMBOL_SIZE * 0.8 * (1442 / 374);
	const INSET = SYMBOL_SIZE * 0.1;
	const freeGame = $derived(context.stateGame.gameType === 'freegame');
	const boardWidth = $derived(context.stateGameDerived.boardLayout().width);

	// WIDE (owner, 2026-08-07): CENTRED on the top rail in both game types. It used
	// to left-align during free spins so the FREE SPINS counter could share that
	// rail; both bonus plates have since moved to the BOTTOM border corners, so
	// this announcement has the top rail to itself and goes back to the middle.
	// That is also what clears the collision the reviewer screenshotted
	// (revisions PDF, item 5) — nothing else is on this rail to collide with.
	const desktopScale = $derived(freeGame ? 0.88 : 1);
	const desktopPosition = $derived({
		x: boardWidth * 0.5,
		y: -SYMBOL_SIZE * 0.8 * 0.58,
	});

	// STACKED: centred over the top rail in BOTH game types. The old free-spins
	// left-shift was a workaround for the FREE SPINS plate sharing this row; that
	// plate now sits a full row higher (see FreeSpinCounter.svelte).
	const portraitPosition = $derived({
		x: boardWidth * 0.5,
		y: -SYMBOL_SIZE * 0.8 * 0.68,
	});

	const position = $derived(
		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,
	);

	// owner: HALF SIZE on mobile only; desktop is unchanged.
	const scale = $derived(context.stateLayoutDerived.isStacked() ? 0.64 : desktopScale);
</script>

<FadeContainer show={props.show}>
	<BoardContainer>
		<Container {...position} {scale}>
			{@render props.children()}
		</Container>
	</BoardContainer>
</FadeContainer>
