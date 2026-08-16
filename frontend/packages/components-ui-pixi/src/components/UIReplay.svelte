<script lang="ts">
	import { EnableSpaceHold } from 'components-shared';

	import UiFadeContainer from './UiFadeContainer.svelte';
	import LabelWin from './LabelWin.svelte';
	import LabelBet from './LabelBet.svelte';
	import ButtonPayTable from './ButtonPayTable.svelte';
	import ButtonGameRules from './ButtonGameRules.svelte';
	import ButtonSettings from './ButtonSettings.svelte';
	import ButtonTurbo from './ButtonTurbo.svelte';
	import ButtonMenu from './ButtonMenu.svelte';
	import ButtonMenuClose from './ButtonMenuClose.svelte';
	import ButtonSoundSwitch from './ButtonSoundSwitch.svelte';
	import { stateUi } from 'state-shared';
	import { BLACK } from 'constants-shared/colors';
	import { MainContainer } from 'components-layout';
	import { Container, Rectangle } from 'pixi-svelte';
	import { getContext } from '../context';
	import type { LayoutUiProps } from '../types';
	import LabelFreeSpinCounter from './LabelFreeSpinCounter.svelte';

	type Props = {
		gameName: LayoutUiProps['gameName'];
		logo: LayoutUiProps['logo'];
	};

	const props: Props = $props();
	const context = getContext();
</script>

<EnableSpaceHold />

<UiFadeContainer>
	<Container x={20}>
		{@render props.gameName()}
	</Container>

	<Container x={context.stateLayoutDerived.canvasSizes().width - 20}>
		{@render props.logo()}
	</Container>

	<MainContainer standard alignVertical="bottom">
		{#if stateUi.freeSpinCounterShow && ['portrait', 'tablet'].includes(context.stateLayoutDerived.layoutType())}
			<Container x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5} y={120}>
				<LabelFreeSpinCounter stacked />
			</Container>
		{/if}

		<!--
			Replay HUD lives in the bottom strip BELOW the centred game board. The
			board fills the vertical space at 16:9 and the landscape "popout" ratios,
			so the old centred offsets (height-270 / -150 and width*0.5 - 350) clipped
			into the board frame and the bottom-left symbols/multiplier row. Anchoring
			to the bottom edge (height - 80) and to the left / right keeps every element
			clear of the board across desktop, landscape and portrait: the board frame
			bottom lands at ~y 965 of the 1080-tall standard box in the wide layouts,
			and even higher-relative in portrait, so height - 80 is always below it.
		-->
		<Container
			x={110}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 80}
			scale={0.7}
		>
			<ButtonMenu />
		</Container>

		<Container
			x={250}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 80}
			scale={0.7}
		>
			<ButtonTurbo />
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width * 0.5 - 40}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 80}
			scale={0.75}
		>
			<LabelWin stacked />
		</Container>

		<Container
			x={context.stateLayoutDerived.mainLayoutStandard().width - 280}
			y={context.stateLayoutDerived.mainLayoutStandard().height - 80}
			scale={0.75}
		>
			<LabelBet stacked />
		</Container>
	</MainContainer>

	{#if stateUi.menuOpen}
		<Rectangle
			eventMode="static"
			cursor="pointer"
			alpha={0.5}
			anchor={0.5}
			backgroundColor={BLACK}
			width={context.stateLayoutDerived.canvasSizes().width}
			height={context.stateLayoutDerived.canvasSizes().height}
			x={context.stateLayoutDerived.canvasSizes().width * 0.5}
			y={context.stateLayoutDerived.canvasSizes().height * 0.5}
			onpointerup={() => (stateUi.menuOpen = false)}
		/>

		<MainContainer standard alignVertical="bottom">
			<!-- drawer opens upward from the relocated bottom-left menu button -->
			<Container
				x={110}
				y={context.stateLayoutDerived.mainLayoutStandard().height - 80}
			>
				<Container scale={0.8} y={0 * 0.5 - 150 - 170 * 3}>
					<ButtonPayTable anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5 - 150 - 170 * 2}>
					<ButtonGameRules anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5 - 150 - 170 * 1}>
					<ButtonSettings anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5 - 150}>
					<ButtonSoundSwitch anchor={0.5} />
				</Container>

				<Container scale={0.8} y={0 * 0.5}>
					<ButtonMenuClose anchor={0.5} />
				</Container>
			</Container>
		</MainContainer>
	{/if}
</UiFadeContainer>
