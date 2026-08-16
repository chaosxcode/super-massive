import { SECOND } from 'constants-shared/time';

import { SFX } from './soundMap';

export const winLevelMap = {
	// LEVEL 0 IS LOAD-BEARING — do not remove.
	// math/engine.py's win_level() returns 0 for any total <= 0, so every
	// zero-paying free-spins feature emits `freeSpinEnd` with winLevel 0. This
	// map previously started at 1, so that lookup returned undefined, the
	// `{#if winLevelData}` block in FreeSpinOutro.svelte never rendered,
	// startCountUp() never ran, and the `await waitForResolve(...)` in its
	// freeSpinOutroCountUp handler never resolved. The book-event chain then
	// stalled forever at freeSpinEnd: setTotalWin/finalWin never processed,
	// endGame never ran, /wallet/end-round was never called, and Stake was left
	// holding an active round — the "game becomes stuck at the end of the
	// bonus" in the review. Hit ~1.96% of bonus features, 0.22% superbonus,
	// 0.28% ejecta.
	0: {
		level: 0,
		alias: 'zero',
		type: 'small',
		text: null,
		presentDuration: 0,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	1: {
		level: 1,
		alias: 'zero',
		type: 'small',
		text: null,
		presentDuration: 0,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	2: {
		level: 2,
		alias: 'standard',
		type: 'small',
		text: null,
		presentDuration: 0.6 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	3: {
		level: 3,
		alias: 'small',
		type: 'small',
		text: null,
		presentDuration: 1 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	// LEVELS 4 AND 5 CARRY THE BIG-WIN CELEBRATIONS. math/engine.py's
	// win_level() emits ONLY 0/2/3/4/5 (0 zero, 2 <100x, 3 <500x, 4 <2000x,
	// 5 >=2000x) — the sting/plaque presentations previously lived exclusively
	// at levels 6-10, which no book ever emits, so no big win ever celebrated.
	// 4 takes the 'big'-tier presentation (level 6's), 5 the 'epic'-tier one
	// with a shorter duration (NOT the 32s max-win treatment). Levels 6-10 are
	// kept untouched for the map's shape/typing.
	4: {
		level: 4,
		alias: 'big',
		type: 'big',
		text: 'STELLAR WIN',
		presentDuration: 6 * SECOND,
		sound: { sfx: SFX.bigWinSting, bgm: undefined },
		animation: true,
	},
	5: {
		level: 5,
		alias: 'epic',
		type: 'big',
		text: 'GAMMA BURST',
		presentDuration: 10 * SECOND,
		sound: { sfx: SFX.bigWinSting, bgm: undefined },
		animation: true,
	},
	// HADES SPINS win tiers (confirmed "fire escalation" set, HADES_FORK_NOTES.md).
	// Alias keys are the engine's — ONLY the display text changes.
	6: {
		level: 6,
		alias: 'big',
		type: 'big',
		text: 'STELLAR WIN',
		presentDuration: 6 * SECOND,
		sound: { sfx: SFX.bigWinSting, bgm: undefined },
		animation: true,
	},
	7: {
		level: 7,
		alias: 'superwin',
		type: 'big',
		text: 'NOVA',
		presentDuration: 18 * SECOND,
		sound: { sfx: SFX.bigWinSting, bgm: undefined },
		animation: true,
	},
	8: {
		level: 8,
		alias: 'mega',
		type: 'big',
		text: 'SUPERNOVA',
		presentDuration: 20 * SECOND,
		sound: { sfx: SFX.bigWinSting, bgm: undefined },
		animation: true,
	},
	9: {
		level: 9,
		alias: 'epic',
		type: 'big',
		text: 'GAMMA BURST',
		presentDuration: 26 * SECOND,
		sound: { sfx: SFX.bigWinSting, bgm: undefined },
		animation: true,
	},
	10: {
		level: 10,
		alias: 'max',
		type: 'big',
		text: 'SUPERMASSIVE WIN',
		presentDuration: 32 * SECOND,
		sound: { sfx: SFX.maxWinSting, bgm: undefined },
		animation: true,
	},
} as const;

export type WinLevelMap = typeof winLevelMap;
export type WinLevel = keyof typeof winLevelMap;
export type WinLevelData = WinLevelMap[WinLevel];
export type WinLevelAlias = WinLevelData['alias'];
