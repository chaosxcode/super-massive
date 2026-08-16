import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		clusterSize?: number;
		win: number;
		positions: Position[];
		meta: {
			globalMult: number;
			clusterMult: number;
			winWithoutMult: number;
			overlay: Position;
		};
	}[];
};

type BookEventSetTumbleWin = {
	index: number;
	type: 'updateTumbleWin';
	amount: number;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

// SUPERMASSIVE mechanics (synthetic math; real math will mirror these shapes):
// the hole's cascade multiplier, wilds it spits back, and the cat-snap bonus.
type BookEventGravityMult = {
	index: number;
	type: 'gravityMult';
	mult: number; // current gravity multiplier applied to this cascade's wins
	step: number; // 0-based ladder step (drives the hole's size/heat)
};

type BookEventWildEjecta = {
	index: number;
	type: 'wildEjecta';
	positions: Position[]; // cells (post-slide) where the burped wilds land
};

type BookEventCatSnap = {
	index: number;
	type: 'catSnap';
	amount: number; // instant prize dragged back by the cat
};

// CONTRACT.md deviation 1 — wincap celebration: emitted the moment the round
// hits the 5000x cap, right after the capping winInfo sequence; the book
// truncates after it (only setTotalWin / freeSpinEnd / finalWin follow).
type BookEventWincap = {
	index: number;
	type: 'wincap';
	amount: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventTumbleBoard = {
	index: number;
	type: 'tumbleBoard';
	explodingSymbols: Position[];
	newSymbols: RawSymbol[][];
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

// new
type BookEventUpdateGrid = {
	index: number;
	type: 'updateGrid';
	gridMultipliers: number[][];
};

// new (acqua_alta tide mechanic — see docs-research/CONTRACT.md)
export type TideMarkName =
	| 'Laguna'
	| 'Sirena'
	| 'Campanella'
	| 'Marangona'
	| 'Tempesta'
	| 'Diluvio'
	| 'AcquaGranda'
	| 'OltreIlRecord';

export type TideUpdatedCell = { reel: number; row: number; mult: number };

type BookEventTideLevel = {
	index: number;
	type: 'tideLevel';
	level: number;
	markName: TideMarkName;
	gameType: GameType;
	updatedCells: TideUpdatedCell[];
};

type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	positions: Position[];
};

// NOTE: no `createBonusSnapshot` — CONTRACT.md deviation 4: the event type does
// not exist anywhere in the SDK and is never emitted; resume restore happens in
// utils.ts without a synthesized book event.

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTumbleWin
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventUpdateFreeSpin
	| BookEventWincap
	| BookEventTumbleBoard
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	// new
	| BookEventUpdateGrid
	| BookEventTideLevel
	| BookEventFreeSpinRetrigger
	| BookEventGravityMult
	| BookEventWildEjecta
	| BookEventCatSnap;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
