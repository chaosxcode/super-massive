<script lang="ts">
	import { Container } from 'pixi-svelte';

	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolX } from '../game/utils';
	import type { TumbleSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		tumbleSymbol: TumbleSymbol;
	};

	const props: Props = $props();
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.tumbleSymbol.symbolY.current}
	animating={props.tumbleSymbol.symbolState === 'explosion'}
>
	<Container
		x={props.tumbleSymbol.fallX}
		rotation={props.tumbleSymbol.fallRotation}
		scale={{ x: props.tumbleSymbol.fallScaleX, y: props.tumbleSymbol.fallScaleY }}
	>
		<Symbol
			state={props.tumbleSymbol.symbolState}
			rawSymbol={props.tumbleSymbol.rawSymbol}
			oncomplete={props.tumbleSymbol.oncomplete}
			originX={getSymbolX(props.reelIndex)}
			originY={props.tumbleSymbol.symbolY.current}
		/>
	</Container>
</SymbolWrap>
