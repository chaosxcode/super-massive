import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventBoardFrame } from '../components/BoardFrame.svelte';
import type { EmitterEventClusterWinAmounts } from '../components/ClusterWinAmounts.svelte';
import type { EmitterEventTumbleBoard } from '../components/TumbleBoard.svelte';
import type { EmitterEventTumbleWinAmount } from '../components/TumbleWinAmount.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventMultiplierGrid } from '../components/MultiplierGrid.svelte';
import type { EmitterEventWaterPlane } from '../components/WaterPlane.svelte';
import type { EmitterEventDepthGauge } from '../components/DepthGauge.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';
import type { EmitterEventMascot } from '../components/Mascot.svelte';
import type { EmitterEventBlackHole } from '../components/BlackHole.svelte';
import type { EmitterEventWaveTransition } from '../components/WaveTransition.svelte';
import type { EmitterEventEjectaReactor } from '../components/EjectaReactor.svelte';

type EmitterEventTether = { type: 'mascotTetherReconnect' } | { type: 'mascotTetherReset' };

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventBoardFrame
	| EmitterEventClusterWinAmounts
	| EmitterEventTumbleBoard
	| EmitterEventTumbleWinAmount
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound
	| EmitterEventMultiplierGrid
	| EmitterEventWaterPlane
	| EmitterEventDepthGauge
	| EmitterEventTransition
	| EmitterEventMascot
	| EmitterEventBlackHole
	| EmitterEventEjectaReactor
	| EmitterEventTether
	| EmitterEventWaveTransition;
