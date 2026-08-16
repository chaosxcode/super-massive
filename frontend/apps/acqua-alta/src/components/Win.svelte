<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import WinAnimation from './WinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';
	import { tween, createTweenToken } from '../game/tween';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});
	let flashAlpha = $state(0);
	const flashToken = createTweenToken();
	// the big-win value grows with tier (level 6 = big … up to max)
	const tierFont = (lvl = 6) => SYMBOL_SIZE * (1.2 + Math.max(0, lvl - 6) * 0.24);

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<!-- deeper themed scrim so bright orbs/vortex don't poke through the celebration -->
					<CanvasSizeRectangle backgroundColor={0x04141f} backgroundAlpha={0.66} />
					{#if flashAlpha > 0.01}
						<!-- white flash burst as the card slams in (brighter for higher tiers) -->
						<CanvasSizeRectangle backgroundColor={0xffffff} backgroundAlpha={flashAlpha} />
					{/if}
				{/if}

				<OnMount
					onmount={async () => {
						if (isBigWin) {
							const a = 0.6 + Math.max(0, (winLevelData.level ?? 6) - 6) * 0.1;
							flashAlpha = a;
							tween({ from: a, to: 0, duration: 300, onUpdate: (v) => (flashAlpha = v), token: flashToken }); // prettier-ignore
						}
						await startCountUp();
						await waitForTimeout(300);
						oncomplete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if winLevelData?.animation}
							<WinAnimation text={winLevelData.text}>
								<ResponsiveBitmapText
									anchor={0.5}
									maxWidth={context.stateGameDerived.boardLayout().width * 0.8}
									text={bookEventAmountToCurrencyString(countUpAmount)}
									style={{
										fontFamily: 'gold',
										fontSize: tierFont(winLevelData.level),
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
							</WinAnimation>
						{:else}
							<ResponsiveBitmapText
								anchor={0.5}
								maxWidth={context.stateLayoutDerived.canvasSizes().width /
									context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'gold',
									fontSize: SYMBOL_SIZE,
									align: 'center',
									fontWeight: 'bold',
									letterSpacing: 0,
								}}
							/>
						{/if}
					</Container>
				</MainContainer>

				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData?.alias} />

				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
