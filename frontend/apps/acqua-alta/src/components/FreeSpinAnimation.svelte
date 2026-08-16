<script lang="ts" module>
	// final art panels (RGBA plates, copy renders in-engine)
	export type FreeSpinPanelKey = 'fs_intro_panel' | 'fs_outro_panel' | 'fs_retrigger_plate';

	// shipped plate aspect ratios (height / width) — HADES SPINS v4 plates
	const PANEL_RATIO_MAP: Record<FreeSpinPanelKey, number> = {
		fs_intro_panel: 809 / 1575,
		fs_outro_panel: 837 / 1631,
		fs_retrigger_plate: 761 / 1525,
	};

	// the v4 plates are keyed + trimmed symmetric, so no X centring nudge is
	// needed (the old Poseidon outro art sat right-of-centre and needed -0.13)
	const PANEL_X_OFFSET: Partial<Record<FreeSpinPanelKey, number>> = {};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { elasticOut, cubicOut } from 'svelte/easing';

	import { Container, Sprite, type Sizes } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import { tween, createTweenToken } from '../game/tween';

	type Props = {
		panelKey?: FreeSpinPanelKey;
		children: Snippet<[{ sizes: Sizes }]>;
	};

	const props: Props = $props();
	const context = getContext();

	const panelKey = $derived(props.panelKey ?? 'fs_intro_panel');
	const BACKGROUND_WIDTH = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const backgroundSizes = $derived({
		width: BACKGROUND_WIDTH,
		height: BACKGROUND_WIDTH * PANEL_RATIO_MAP[panelKey],
	});
	const panelXOffset = $derived((PANEL_X_OFFSET[panelKey] ?? 0) * BACKGROUND_WIDTH);

	let scale = $state(0.8);
	let alpha = $state(0);

	const token = createTweenToken();

	onMount(() => {
		tween({ from: 0, to: 1, duration: 250, easing: cubicOut, onUpdate: (v) => (alpha = v), token }); // prettier-ignore
		tween({ from: 0.8, to: 1, duration: 650, easing: elasticOut, onUpdate: (v) => (scale = v), token }); // prettier-ignore

		return () => (token.cancelled = true);
	});
</script>

<MainContainer>
	<Container
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
		{scale}
		{alpha}
	>
		<Sprite key={panelKey} anchor={0.5} x={panelXOffset} width={backgroundSizes.width * 1.06} height={backgroundSizes.height * 1.06} />
		{@render props.children({ sizes: backgroundSizes })}
	</Container>
</MainContainer>
