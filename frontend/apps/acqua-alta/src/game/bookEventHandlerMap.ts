import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { MUSIC, SFX } from './soundMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { tween } from './tween';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';

// stateBet.activeBetModeKey's CASING IS NOT STABLE — it defaults to 'BASE', is
// set from stateBonus.selectedBetModeKey / betToResume.mode elsewhere, and
// stateBet's own activeBetMode() has to try BOTH .toUpperCase() and
// .toLowerCase() to resolve it. Comparing it raw against a lowercase literal is
// therefore a silent no-op: that is why the EJECTA REACTOR never charged and no
// Wilds were ever fired in the 225x feature. Always compare through this.
const modeIs = (...keys: string[]) => {
	const active = stateBet.activeBetModeKey?.toLowerCase();
	return keys.some((key) => key.toLowerCase() === active);
};

// the bgm currently under the board (base, or bonus in free spins / superspin)
const currentBgm = () =>
	stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame'
		? MUSIC.freeSpin
		: MUSIC.base;

// only true while a big-win duck is active, so the restore fade never fires on a
// small/medium win (which would audibly yank the music down to 0.32 then ramp back)
let musicDucked = false;

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: SFX.bigWinCoinLoop });
		// duck the music so the win sting, coin tally and Poseidon's voice punch
		// through the celebration; restored in winLevelSoundsStop.
		eventEmitter.broadcast({
			type: 'soundFade',
			name: currentBgm(),
			from: 1,
			to: 0.32,
			duration: 350,
		});
		musicDucked = true;
	}
	// Poseidon vocalises in time with the mascot's trident slam
	if (winLevelData?.alias === 'max') {
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.poseidonLaugh });
	} else if (['mega', 'epic'].includes(winLevelData?.alias ?? '')) {
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.poseidonYell });
	} else if (['big', 'superwin'].includes(winLevelData?.alias ?? '')) {
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.poseidonGrunt });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: SFX.bigWinCoinLoop });
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: MUSIC.freeSpin });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: MUSIC.base });
	}
	// lift the music back to full ONLY if a big win actually ducked it — otherwise
	// the fade would yank a small/medium win's music down to 0.32 then ramp back up
	if (musicDucked) {
		eventEmitter.broadcast({
			type: 'soundFade',
			name: currentBgm(),
			from: 0.32,
			to: 1,
			duration: 700,
		});
		musicDucked = false;
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

// trauma-based camera shake (Vlambeer / codex §27): perceived shake is QUADRATIC and
// amplitude scales with the event (tide level / win tier / cascade size) so weight
// escalates instead of every beat feeling the same 4px nudge.
const shakeBoard = (intensity = 1) => {
	const i = Math.max(0, Math.min(1.4, intensity));
	const maxAmp = 13 * i; // px at 1080p-equivalent main coords
	const duration = 320 + 320 * Math.min(1, i);
	return tween({
		from: 0,
		to: 1,
		duration,
		onUpdate: (progress) => {
			const trauma = (1 - progress) * (1 - progress); // quadratic falloff
			const amp = maxAmp * trauma;
			stateGame.boardShake.x = amp * Math.sin(progress * 47);
			stateGame.boardShake.y = amp * Math.cos(progress * 33);
		},
	}).then(() => {
		stateGame.boardShake.x = 0;
		stateGame.boardShake.y = 0;
	});
};

// a tide row is submerged iff the whole row carries a multiplier (levels 1-7
// write x2 across the row; caps keep submerged cells >= 2) — used to re-sync
// the water from updateGrid (freegame persistence / dry bonus entry / resume).
const countSubmergedRows = (gridMultipliers: number[][]) => {
	const numRows = gridMultipliers[0].length;
	let rows = 0;
	for (let row = numRows - 1; row >= 0; row -= 1) {
		if (gridMultipliers.every((reel) => reel[row] >= 2)) rows += 1;
		else break;
	}
	return rows;
};

// cascade step within the current spin — drives the accelerate-into-climax cadence
let cascadeStep = 0;

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		cascadeStep = 0; // reset cascade cadence at the start of the spin
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;

		if (bookEvent.gameType === 'basegame') {
			// CONTRACT.md: basegame tide + grid reset at spin end with NO reset
			// event — the frontend drains the water (0.8s) on the next reveal.
			// Runs alongside the respin; in freegame the flood persists.
			eventEmitter.broadcast({ type: 'waterPlaneDrain' });
			eventEmitter.broadcast({ type: 'depthGaugeReset' });
			eventEmitter.broadcast({ type: 'multiplierGridClear' });
		}

		// Mascot reacts to a winning spin AS THE REELS LAND — we already know the
		// whole round from the book, so look ahead within THIS spin (up to the next
		// reveal) and, if it wins, fire him now so he's mid-swing by the time the
		// payout animates (instead of reacting late on winShow).
		const restEvents = bookEvents.slice(bookEvents.indexOf(bookEvent) + 1);
		const nextRevealIdx = restEvents.findIndex((e) => e.type === 'reveal');
		const thisSpinEvents = nextRevealIdx === -1 ? restEvents : restEvents.slice(0, nextRevealIdx);
		const spinHasWin = thisSpinEvents.some(
			(e) => (e.type === 'winInfo' && e.wins.length > 0) || e.type === 'freeSpinTrigger',
		);
		if (spinHasWin) eventEmitter.broadcast({ type: 'mascotReact' });

		await stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent });
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		const promise1 = async () => {
			eventEmitter.broadcast({ type: 'soundOnce', name: SFX.winSmall });
			await animateSymbols({ positions: _.flatten(bookEvent.wins.map((win) => win.positions)) });
		};

		const promise2 = async () => {
			await eventEmitter.broadcastAsync({
				type: 'showClusterWinAmounts',
				wins: bookEvent.wins.map((win) => {
					return {
						win: win.meta.winWithoutMult,
						mult: win.meta.globalMult,
						result: win.meta.winWithoutMult * win.meta.globalMult,
						reel: win.meta.overlay.reel,
						row: win.meta.overlay.row,
					};
				}),
			});
		};

		await Promise.all([promise1(), promise2()]);

		if (modeIs('ejecta') && stateGame.gameType === 'freegame') {
			const charge = bookEvent.wins.reduce((total, win) => {
				const clusterSize = win.clusterSize ?? win.positions.length;
				return total + (clusterSize >= 9 ? 2 : clusterSize >= 6 ? 1 : 0);
			}, 0);
			if (charge > 0) {
				await eventEmitter.broadcastAsync({ type: 'ejectaReactorCharge', amount: charge });
			}
		}
	},
	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		if (bookEvent.amount > 0) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountShow' });
			eventEmitter.broadcast({
				type: 'tumbleWinAmountUpdate',
				amount: bookEvent.amount,
				animate: false,
			});
		}
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		if (modeIs('ejecta')) {
			eventEmitter.broadcast({ type: 'ejectaReactorShow' });
		}
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.scatterWin });
		await animateSymbols({ positions: bookEvent.positions });
		// Hades' splash washes over the entry into free spins — same clip the bonus BUY
		// plays. A buy already fired it from ModalBuyBonusConfirm (its book carries this
		// same freeSpinTrigger event), so only fire it here for a NATURAL scatter trigger.
		if (!modeIs('wildshot', 'bonus', 'ejecta', 'superbonus')) {
			eventEmitter.broadcast({ type: 'bonusWave' });
		}
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.freeSpinSting });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.freeSpinIntroJingle });
		eventEmitter.broadcast({ type: 'soundMusic', name: MUSIC.freeSpin });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.totalFs,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.scatterWin });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.freeSpinSting });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.retriggerPeal });
		eventEmitter.broadcast({ type: 'soundMusic', name: MUSIC.freeSpin });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
			retrigger: true,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.totalFs,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
	},
	// NO `updateGlobalMult` handler — CONTRACT.md: the acqua_alta math never
	// emits it (global multiplier stays 1).
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		// FreeSpinOutro only renders its count-up (and therefore only ever resolves
		// the promise this handler awaits) inside `{#if winLevelData}`. An unknown
		// level would deadlock the whole book-event chain and leave the round
		// unsettled, so never await the outro for one — fall back to the 'zero'
		// presentation instead. See the comment on winLevelMap level 0.
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel] ?? winLevelMap[0];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.youWonPanel });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			// Use the total carried by the terminal bonus event. setTotalWin ordering can
			// vary between math packages, so mutable HUD state is not authoritative here.
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'ejectaReactorHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		// the persistent flood finally recedes when the bonus ends
		eventEmitter.broadcast({ type: 'waterPlaneDrain' });
		eventEmitter.broadcast({ type: 'depthGaugeReset' });
		eventEmitter.broadcast({ type: 'multiplierGridClear' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	gravityMult: async (bookEvent: BookEventOfType<'gravityMult'>) => {
		eventEmitter.broadcast({ type: 'gravityMultSet', mult: bookEvent.mult, step: bookEvent.step });
	},
	wildEjecta: async (bookEvent: BookEventOfType<'wildEjecta'>) => {
		// The hole fires Wilds back onto the board. `positions` are the cells that
		// are ALREADY Wild in the scored math state — the animation reveals them,
		// it never picks, moves or re-orders them, and WildEjecta re-asserts every
		// position onto the board when the sequence ends.
		//
		// In `ejecta` mode this is the ONE and only Reactor trigger path (the math
		// deliberately disables ordinary per-cluster wild injection there so the
		// on-screen meter can never desync). Broadcast instead of awaiting: the
		// meter dumping its three charges is meant to OVERLAP the hole's spool-up,
		// so the player reads one continuous cause and effect rather than two
		// queued animations — and 63% of Reactor features fire this repeatedly.
		if (modeIs('ejecta')) {
			eventEmitter.broadcast({ type: 'ejectaReactorFire' });
		}
		await eventEmitter.broadcastAsync({ type: 'wildEjectaFly', positions: bookEvent.positions });
	},
	catSnap: async (bookEvent: BookEventOfType<'catSnap'>) => {
		// tether snaps, the cat is briefly eaten, claws back out with a prize
		await eventEmitter.broadcastAsync({ type: 'catSnapPlay', amount: bookEvent.amount });
	},
	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>) => {
		eventEmitter.broadcast({ type: 'boardHide' });
		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({ type: 'tumbleBoardInit', addingBoard: bookEvent.newSymbols });
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.clusterPop });
		await eventEmitter.broadcastAsync({
			type: 'tumbleBoardExplode',
			explodingPositions: bookEvent.explodingSymbols,
		});
		// detonation punch — bigger clusters hit harder
		shakeBoard(Math.min(0.55, 0.2 + bookEvent.explodingSymbols.length * 0.02));
		eventEmitter.broadcast({ type: 'tumbleBoardRemoveExploded' });
		await eventEmitter.broadcastAsync({ type: 'tumbleBoardSlideDown', step: cascadeStep });
		cascadeStep += 1;
		eventEmitter.broadcast({
			type: 'boardSettle',
			board: stateGameDerived
				.tumbleBoardCombined()
				.map((tumbleReel) => tumbleReel.map((tumbleSymbol) => tumbleSymbol.rawSymbol)),
		});
		eventEmitter.broadcast({ type: 'tumbleBoardReset' });
		eventEmitter.broadcast({ type: 'tumbleBoardHide' });
		eventEmitter.broadcast({ type: 'boardShow' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		// updateTumbleWin already presents ordinary wins on the board. Replaying the
		// same value here creates a second count directly beneath it; reserve this
		// full-screen channel for actual named big-win celebrations.
		// Optional chaining is deliberate: an unknown level must bail out here, not
		// throw mid-chain and strand the round unsettled.
		if (!winLevelData?.animation) return;

		eventEmitter.broadcast({ type: 'winShow' });
		shakeBoard(0.7 + (bookEvent.winLevel - 6) * 0.2);
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	tideLevel: async (bookEvent: BookEventOfType<'tideLevel'>) => {
		// the hook beat (CONTRACT.md + design events_and_animations): Marangona
		// bell pitched +1 step per level, brass gauge needle to the named mark,
		// water rises one row in 0.6s ease-out with a 4px decaying shake, then
		// the submerged badges pop in / count up.
		eventEmitter.broadcast({ type: 'soundTideBell', level: bookEvent.level });
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.tideSurge });
		eventEmitter.broadcast({
			type: 'depthGaugeUpdate',
			level: bookEvent.level,
			markName: bookEvent.markName,
		});
		// Poseidon CAUSES the tide: he raises his trident and the water surges up with him
		eventEmitter.broadcast({ type: 'mascotReact', clip: 'tideraise' });
		shakeBoard(0.4 + bookEvent.level * 0.1); // the tide quake escalates as the water climbs
		await eventEmitter.broadcastAsync({ type: 'waterPlaneRise', level: bookEvent.level });
		eventEmitter.broadcast({ type: 'multiplierGridShow' });
		await eventEmitter.broadcastAsync({
			type: 'multiplierGridCellsUpdate',
			cells: bookEvent.updatedCells,
		});
	},
	updateGrid: async (bookEvent: BookEventOfType<'updateGrid'>) => {
		// rendered in BOTH basegame and freegame (CONTRACT.md). Doubles as the
		// flood re-sync channel: math re-emits reveal -> updateGrid every
		// freegame spin (and on dry bonus entry) so water/badges always match.
		eventEmitter.broadcast({ type: 'multiplierGridShow' });
		eventEmitter.broadcast({ type: 'multiplierGridUpdate', grid: bookEvent.gridMultipliers });
		const rows = countSubmergedRows(bookEvent.gridMultipliers);
		eventEmitter.broadcast({ type: 'waterPlaneSync', rows });
		if (rows === 0) eventEmitter.broadcast({ type: 'depthGaugeReset' });
	},
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {
		// CONTRACT.md deviation 1 — the 5000x cap celebration. The book truncates
		// after this event (only setTotalWin/freeSpinEnd/finalWin follow), so this
		// IS the payoff beat: a full-screen flood sweep (the lagoon surge
		// transition), then the MAX WIN plaque (plaque_maxwin via winLevelMap
		// alias 'max') with the maxwin sting and the murano-shard/gold-fleck
		// fireworks (WinCoins emits for the duration of the count-up).
		const winLevelData = winLevelMap[10]; // alias 'max' -> MAX WIN plaque
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.tideSurge });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' }); // flood sweep
		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// the flooded result stays on screen until the next reveal drains it
		// (basegame) — only the transient win chrome is dropped here.
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
	},
	// NO `createBonusSnapshot` handler — CONTRACT.md deviation 4: the event does
	// not exist. Resume restore lives in utils.ts (restoreBonusSnapshot).
};
