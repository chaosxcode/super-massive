<script lang="ts">
	import SymbolSprite from './SymbolSprite.svelte';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { getSymbolInfo } from '../game/utils';
	import { SFX } from '../game/soundMap';
	import { getContext } from '../game/context';

	type Props = {
		x?: number;
		y?: number;
		// board-space position of the cell when the wrapper (SymbolWrap) owns the
		// transform — the spaghettification infall needs it to aim at the hole
		originX?: number;
		originY?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));

	$effect(() => {
		if (props.state === 'explosion' && props.rawSymbol.name === 'W') {
			context.eventEmitter?.broadcast({ type: 'soundOnce', name: SFX.wildExplode });
		}
	});
</script>

<SymbolSprite
	{symbolInfo}
	state={props.state}
	x={props.x}
	y={props.y}
	originX={props.originX}
	originY={props.originY}
	oncomplete={props.oncomplete}
	loop={props.loop}
/>
