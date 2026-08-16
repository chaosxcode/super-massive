<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number; retrigger?: boolean };
</script>

<script lang="ts">
	import { elasticOut } from 'svelte/easing';
	import { CanvasSizeRectangle } from 'components-layout';
	import { stateUrlDerived } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { BitmapText, Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';

	const context = getContext();

	let show = $state(false);
	let freeSpinsFromEvent = $state(0);
	let numberScale = $state(1);
	let retrigger = $state(false);
	let oncomplete = $state(() => {});
	let token: TweenToken = createTweenToken();

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async (emitterEvent) => {
			freeSpinsFromEvent = emitterEvent.totalFreeSpins;
			retrigger = emitterEvent.retrigger ?? false;
			// number pop (stand-in for the spine number intro animation)
			token.cancelled = true;
			token = createTweenToken();
			tween({ from: 0.4, to: 1, duration: 600, easing: elasticOut, onUpdate: (v) => (numberScale = v), token }); // prettier-ignore
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

	<FreeSpinAnimation panelKey={retrigger ? 'fs_retrigger_plate' : 'fs_intro_panel'}>
		{#snippet children({ sizes })}
			<Sprite
				anchor={0.5}
				y={-sizes.height * 0.28 - 15}
				width={sizes.width * 0.85}
				height={sizes.width * 0.85 * (156 / 500)}
				key="freespins_{stateUrlDerived.lang()}.png"
			/>

			<!-- owner: both sat too low on the frame; lifted. -->
			<Container y={sizes.height * -0.02} scale={numberScale}>
				<BitmapText
					anchor={{ x: 0.5, y: 0.5 }}
					text={freeSpinsFromEvent}
					style={{
						fontFamily: 'gold',
						fontSize: sizes.width * 0.28,
						fontWeight: 'bold',
					}}
				/>
			</Container>

			<Sprite
				anchor={0.5}
				y={sizes.height * 0.26}
				width={sizes.width * 0.45}
				height={sizes.width * 0.45 * (42 / 183)}
				key="freespins.png"
			/>
		{/snippet}
	</FreeSpinAnimation>

	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
