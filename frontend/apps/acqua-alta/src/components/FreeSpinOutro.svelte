<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';

	const context = getContext();
	const isStacked = $derived(context.stateLayoutDerived.isStacked());

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		freeSpinOutroHide: async () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const duration = winLevelData.presentDuration}
		{@const isBigWin = winLevelData.type === 'big'}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />

				<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />

				<FreeSpinAnimation panelKey="fs_outro_panel">
					{#snippet children({ sizes })}
						{#if isBigWin}
							<Sprite
								anchor={0.5}
								y={-sizes.height * 0.16}
								width={sizes.width * 0.6}
								height={sizes.width * 0.6 * (156 / 500)}
								key="freespins_{stateUrlDerived.lang()}.png"
							/>
						{:else}
							<Sprite
								anchor={0.5}
								y={-sizes.height * 0.16}
								width={sizes.width * 0.6}
								height={sizes.width * 0.6 * (80 / 500)}
								key="winsmall_{stateUrlDerived.lang()}.png"
							/>
						{/if}

						<ResponsiveBitmapText
							anchor={{ x: 0.5, y: 0.5 }}
							y={sizes.height * 0.02}
							style={{
								fontFamily: 'gold',
								fontSize: sizes.width * 0.13,
							}}
							text={bookEventAmountToCurrencyString(countUpAmount)}
							maxWidth={sizes.width * 0.6}
						/>

						<Sprite
							anchor={0.5}
							y={sizes.height * 0.26}
							width={sizes.width * 0.34}
							height={sizes.width * 0.34 * (42 / 177)}
							key="totalwin.png"
						/>
					{/snippet}
				</FreeSpinAnimation>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
