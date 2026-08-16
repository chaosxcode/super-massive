<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App, Container, Sprite, REM } from 'pixi-svelte';
	import { stateUi } from 'state-shared';

	import { UI, UiGameName } from 'components-ui-pixi';
	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import { BOARD_SIZES, FRAME_SIZES, PORTRAIT_BOARD_DROP } from '../game/constants';
	import { sceneLightPulse } from '../game/light.svelte';
	import { performanceProfile } from '../game/performance.svelte';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import ReplayGate from './ReplayGate.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BlackHole from './BlackHole.svelte';
	import WildEjecta from './WildEjecta.svelte';
	import EjectaReactor from './EjectaReactor.svelte';
	import EmberField from './EmberField.svelte';
	import Mascot from './Mascot.svelte';
	import TetherRope from './TetherRope.svelte';
	import HudBar from './HudBar.svelte';
	import HudIcons from './HudIcons.svelte';
	import IntroSplash from './IntroSplash.svelte';
	import WaveTransition from './WaveTransition.svelte';
	import MultiplierGrid from './MultiplierGrid.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import ClusterWinAmounts from './ClusterWinAmounts.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import TumbleWinAmount from './TumbleWinAmount.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import TotalWinAmount from './TotalWinAmount.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';

	type Props = { startupReady?: boolean };
	const props: Props = $props();

	const context = getContext();
	const sceneLight = $derived(sceneLightPulse());

	// first-impression intro splash (bonus cards) shown once after the loader
	let introDone = $state(true);

	// Wordmark scale for small landscape / Popout S windows: at full size the
	// logo covers the board's right columns there. Shrink it to the free gutter
	// right of the board frame (same edge math the mascot uses on the left).
	// Portrait/tablet keep scale 1 — the logo sits above the board there.
	const LOGO_NATURAL_WIDTH = REM * 10.25;
	const LOGO_TEXTURE_WIDTH = 1256;
	const logoScale = $derived.by(() => {
		// owner: bigger on phones/tablets, but 2 overshot — the wordmark reads
		// larger than the raw multiplier suggests because the fade backing scales
		// with it AND the html root font already halves under 500px. 1.4 is the
		// dial; the stacked branch has the sky above the board to itself, so it is
		// not competing with the board for width the way landscape is.
		if (context.stateLayoutDerived.isStacked()) return 1.4;
		const cs = context.stateLayoutDerived.canvasSizes();
		const ml = context.stateLayoutDerived.mainLayout();
		const frameWidth = FRAME_SIZES.width;
		const frameRightX =
			cs.width / 2 + ml.scale * ((ml.width / 2) * 1.01 + frameWidth / 2 - ml.width / 2);
		const gutter = Math.max(0, cs.width - 24 - frameRightX);
		return Math.max(0.3, Math.min(1, gutter / LOGO_NATURAL_WIDTH));
	});

	onMount(() => (context.stateLayout.showLoadingScreen = true));
</script>

<App>
	<!-- keyboard input stays dead until the intro splash is dismissed — space
	     must not start a (hidden) spin behind the splash -->
	{#if introDone}
		<EnableHotkey />
	{/if}
	<EnableGameActor />
	<EnablePixiExtension />

	{#if context.stateLayout.showLoadingScreen}
		<LoadingScreen
			active={props.startupReady ?? true}
			onloaded={() => (context.stateLayout.showLoadingScreen = false)}
		/>
	{:else}
		<EnableSound />
		<Background />
		<ResumeBet />
		<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
		<Sound />

		<!-- portrait: the whole board group rides PORTRAIT_BOARD_DROP px lower, closer to
		     the spin button (the mascot applies the same drop in its own placement math) -->
		<Container y={context.stateLayoutDerived.isStacked() ? PORTRAIT_BOARD_DROP : 0}>
			<MainContainer>
				<BoardFrame />
			</MainContainer>
			<!-- THE black hole: parked off the board's right edge, drawn OVER the
		     frame rail so it reads as swallowing the machine itself -->
			<MainContainer>
				<BlackHole />
			</MainContainer>

			<MainContainer>
				<Board />
				<Anticipations />
				<TumbleWinAmount />
			</MainContainer>

			<MainContainer>
				<TumbleBoard />
			</MainContainer>

			<!-- multiplier badges/numbers ABOVE the water so they stay readable -->
			<MainContainer>
				<MultiplierGrid />
			</MainContainer>

			<!-- BoardSparkle removed (owner, 2026-08-07): its glints were frozen by a
			     $state proxy bug since the fork, so the effect was never actually
			     visible here. Unfreezing it made it appear — as black quads, because
			     it draws from the particles atlas whose meta.image still pointed at a
			     deleted .png. The atlas is fixed; the effect itself was unwanted. -->

			<!-- Wilds ejected by the hole must cross and land above the reel sprites. -->
			<MainContainer>
				<!-- Reactor panel FIRST so the Wild bolts fly OVER it, not behind it.
				     The reverse order is why the panel had to thin its backing plate
				     mid-launch; with this the plate can stay fully opaque. -->
				<EjectaReactor />
				<WildEjecta />
			</MainContainer>

			<!-- cluster win floats render TOPMOST over the water/gauge/badges so an
		     edge-cluster amount is never covered by the frame-side art (Stake round-1 fix) -->
			<MainContainer>
				<ClusterWinAmounts />
			</MainContainer>
		</Container>

		{#if stateUi.config.mode === 'replay'}
			<UI>
				{#snippet gameName()}
					<UiGameName name="" />
				{/snippet}
				{#snippet logo()}
					<!-- soft navy gradient so the wordmark never washes out -->
					<Sprite
						key="label_fade"
						anchor={{ x: 1, y: 0 }}
						y={REM *
							(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
								? 2
								: 1.3) *
							logoScale}
						width={REM *
							(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
								? 10.7
								: 7.2) *
							logoScale}
						height={REM *
							(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
								? 3.25
								: 2.2) *
							logoScale}
					/>
					<!-- POSEIDON'S TIDE wordmark (~1.65:1), top-right; smaller on mobile,
				     gutter-scaled on small landscape/popout so it never covers the board -->
					<Sprite
						key="logo"
						anchor={{ x: 1, y: 0 }}
						scale={(REM *
							(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
								? 10.25
								: 6.85) *
							logoScale) /
							LOGO_TEXTURE_WIDTH}
					/>
				{/snippet}
			</UI>
		{:else}
			<!-- kit thin-bar HUD replaces the pixi control bar; the wordmark keeps
			     its top-right spot as a plain sprite pair -->
			<!-- owner: NO wordmark on phones/tablets — it ate the sky above the board
			     and the board art already carries the brand. Landscape/desktop keep
			     it in the top-right gutter. -->
			<Container
				x={context.stateLayoutDerived.canvasSizes().width - 24}
				y={12}
				visible={!context.stateLayoutDerived.isStacked()}
			>
				<Sprite
					key="label_fade"
					anchor={{ x: 1, y: 0 }}
					y={REM *
						(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType()) ? 2 : 1.3) *
						logoScale}
					width={REM *
						(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
							? 10.7
							: 7.2) *
						logoScale}
					height={REM *
						(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
							? 3.25
							: 2.2) *
						logoScale}
				/>
				<Sprite
					key="logo"
					anchor={{ x: 1, y: 0 }}
					scale={(REM *
						(['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())
							? 10.25
							: 6.85) *
						logoScale) /
						LOGO_TEXTURE_WIDTH}
				/>
			</Container>
		{/if}
		<Win />
		<FreeSpinIntro />
		<FreeSpinCounter />
		<TotalWinAmount />
		<FreeSpinOutro />
		<Transition />
	{/if}
</App>

{#if !context.stateLayout.showLoadingScreen}
	{#if stateUi.config.mode !== 'replay'}
		<HudBar />
	{:else}
		<!-- replay mounts no HudBar, but ModalGameRules' Controls section renders
		     <use href="#ic-…"> against the HUD icon sprite — mount the defs alone
		     so those icons are not blank in replay -->
		<HudIcons />
	{/if}
	<EmberField />
	<TetherRope />
	<Mascot />
	<div
		class="scene-light-flicker"
		style:opacity={performanceProfile.reducedEffects
			? 0.025 + sceneLight * 0.072
			: 0.035 + sceneLight * 0.105}
		aria-hidden="true"
	></div>
	<WaveTransition />
{/if}

{#if !context.stateLayout.showLoadingScreen && !introDone}
	<IntroSplash ondismiss={() => (introDone = true)} />
{/if}

<Modals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</Modals>

<!-- replay approval gate (PLAY / PLAY AGAIN / error) — HTML overlay over the canvas -->
{#if stateUi.config.mode === 'replay'}
	<ReplayGate />
{/if}

<style>
	/* One stationary environmental light over canvas, mascot, rope, and HUD.
	   Its intensity follows sceneLightPulse; there is no full-screen sweep. */
	.scene-light-flicker {
		position: fixed;
		inset: 0;
		z-index: 40;
		pointer-events: none;
		background:
			radial-gradient(ellipse at 38% 20%, rgba(188, 235, 255, 0.82), transparent 62%),
			linear-gradient(
				118deg,
				rgba(255, 189, 92, 0.28),
				rgba(113, 204, 255, 0.2) 58%,
				transparent 82%
			);
		mix-blend-mode: screen;
		will-change: opacity;
	}
</style>
