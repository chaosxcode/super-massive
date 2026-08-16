<script lang="ts" module>
	import { GlowFilter } from 'pixi-filters';

	const PLAQUE_GLOW = new GlowFilter({
		distance: 24,
		outerStrength: 2,
		innerStrength: 0,
		color: 0xc9a227,
		quality: 0.2,
	});

	// final art: 4 distinct win plates (copy stays in-engine — the art has no text).
	// SUPERMASSIVE tiers 8 (SUPERNOVA) and 9 (GAMMA BURST) share the epic plate.
	const PLAQUE_KEY_MAP: Record<string, string> = {
		'STELLAR WIN': 'plaque_grande',
		NOVA: 'plaque_maestoso',
		SUPERNOVA: 'plaque_acqua_granda',
		'GAMMA BURST': 'plaque_acqua_granda',
		'SUPERMASSIVE WIN': 'plaque_maxwin',
	};
	// shipped plate aspect ratios (height / width) — HADES SPINS v4 plaques
	const PLAQUE_RATIO_MAP: Record<string, number> = {
		plaque_grande: 677 / 1585,
		plaque_maestoso: 801 / 1586,
		plaque_acqua_granda: 802 / 1601,
		plaque_maxwin: 870 / 1553,
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { elasticOut, sineInOut } from 'svelte/easing';

	import { Container, Sprite } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { tween, createTweenToken } from '../game/tween';

	// the distinct Venetian plate slams in (elastic pop) and idles with a
	// gentle pulse; tier text + count-up render in-engine over the art
	type Props = {
		text: string | null;
		children: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	const plaqueKey = $derived(PLAQUE_KEY_MAP[props.text ?? ''] ?? 'plaque_grande');
	const plaqueWidth = $derived(context.stateGameDerived.boardLayout().width * 0.98);
	const plaqueHeight = $derived(plaqueWidth * PLAQUE_RATIO_MAP[plaqueKey]);

	let scale = $state(0);
	let pulse = $state(1);

	const token = createTweenToken();

	onMount(() => {
		(async () => {
			await tween({ from: 0, to: 1, duration: 700, easing: elasticOut, onUpdate: (v) => (scale = v), token }); // prettier-ignore
			while (!token.cancelled) {
				await tween({ from: 1, to: 1.04, duration: 800, easing: sineInOut, onUpdate: (v) => (pulse = v), token }); // prettier-ignore
				await tween({ from: 1.04, to: 1, duration: 800, easing: sineInOut, onUpdate: (v) => (pulse = v), token }); // prettier-ignore
			}
		})();

		return () => (token.cancelled = true);
	});
</script>

<Container scale={scale * pulse} filters={[PLAQUE_GLOW]}>
	<Sprite
		key={plaqueKey}
		anchor={0.5}
		y={-SYMBOL_SIZE * 1.1}
		width={plaqueWidth}
		height={plaqueHeight}
	/>
	{#if props.text}
		<ResponsiveBitmapText
			anchor={0.5}
			y={-SYMBOL_SIZE * 1.1}
			text={props.text}
			maxWidth={plaqueWidth * 0.74}
			style={{
				fontFamily: 'gold',
				fontSize: SYMBOL_SIZE * 1.05,
				fontWeight: 'bold',
			}}
		/>
	{/if}
	<Container y={SYMBOL_SIZE * 1.6}>
		{@render props.children()}
	</Container>
</Container>
