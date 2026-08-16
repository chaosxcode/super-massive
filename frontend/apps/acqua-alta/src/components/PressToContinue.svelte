<script lang="ts">
	import { onMount } from 'svelte';

	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { stateUrlDerived, stateBet } from 'state-shared';
	import { Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { stateXstateDerived } from '../game/stateXstate';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// In automated flows (turbo, autoplay/autobet, space-hold) nobody is going to
	// tap "press to continue" — without this the bonus intro/outro stalls the whole
	// autoplay run forever. Auto-advance after a brief beat so it still registers.
	onMount(() => {
		const automated =
			stateBet.isTurbo || stateBet.isSpaceHold || stateXstateDerived.isAutoBetting();
		if (!automated) return;
		const timer = setTimeout(() => props.onpress(), stateBet.isTurbo ? 550 : 1100);
		return () => clearTimeout(timer);
	});
</script>


<MainContainer alignVertical="bottom">
	<Sprite
		key="pressToContinueText_{stateUrlDerived.lang()}.png"
		width={800}
		height={134}
		anchor={{ x: 0.5, y: 1 }}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
