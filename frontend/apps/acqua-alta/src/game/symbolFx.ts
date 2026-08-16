// Per-symbol idle rig config — the pseudo-spine layer. Part geometry (gear /
// core cutouts) comes from the generated SYMBOL_PARTS manifest; this file is
// the hand-tuned choreography: what rotates, ticks, flickers, twinkles and
// pulses on each symbol so the whole board feels mechanically ALIVE.
// All coordinates are 512-space (the symbol source art), scaled in SymbolSprite.
import { SYMBOL_PARTS, type SymbolPart } from './symbolParts';

export type GearFx = SymbolPart & {
	key: string;
	dir: 1 | -1;
	periodMs: number; // one clockwork tick per period
	stepRad: number; // tick size
};
export type SpinFx = SymbolPart & { key: string; speed: number }; // rad/ms
export type FlameFx = SymbolPart & { key: string };
export type SparkleFx = { x: number; y: number; phase: number; size: number };
export type PulseFx = { x: number; y: number; periodMs: number; maxSize: number; tint: number };
export type RockFx = { amp: number; periodMs: number }; // whole-symbol sway

export type BlinkFx = { key: string; periodMs: number; closedMs: number };
export type GleamFx = { maskKey: string; periodMs: number; sweepMs: number; angle: number };
export type SymbolFx = {
	gears?: GearFx[];
	spins?: SpinFx[];
	blink?: BlinkFx;
	gleam?: GleamFx;
	flame?: FlameFx;
	sparkles?: SparkleFx[];
	glowPulse?: PulseFx; // soft additive throb at a point (plasma, cores)
	novaRing?: PulseFx; // expanding ring burst (supernova)
	rock?: RockFx;
};

const gear = (name: string, dir: 1 | -1, periodMs: number): GearFx | undefined => {
	const p = SYMBOL_PARTS[name]?.gear;
	return p && { ...p, key: `part_${name}_gear`, dir, periodMs, stepRad: Math.PI / 6 };
};
const core = (name: string, speed: number): SpinFx | undefined => {
	const p = SYMBOL_PARTS[name]?.core;
	return p && { ...p, key: `part_${name}_core`, speed };
};
// the crystal interior turning inside a STILL silhouette — the cut is the
// gem's inscribed circle, so the facets swirl while the bezel never moves
const gemcore = (name: string, speed: number): SpinFx | undefined => {
	const p = SYMBOL_PARTS[name]?.gemcore;
	return p && { ...p, key: `part_${name}_gemcore`, speed };
};
const defined = <T>(...xs: (T | undefined)[]): T[] => xs.filter(Boolean) as T[];

export const SYMBOL_FX: Record<string, SymbolFx> = {
	L1: {
		gleam: { maskKey: 'part_L1_gemmask', periodMs: 3100, sweepMs: 520, angle: 0.45 },
		gears: defined(gear('L1', 1, 1400)),
		sparkles: [
			{ x: 210, y: 150, phase: 0.0, size: 30 },
			{ x: 320, y: 235, phase: 2.4, size: 22 },
		],
	},
	L2: {
		gleam: { maskKey: 'part_L2_gemmask', periodMs: 3700, sweepMs: 520, angle: 0.45 },
		gears: defined(gear('L2', -1, 1700)),
		sparkles: [
			{ x: 300, y: 150, phase: 1.1, size: 28 },
			{ x: 200, y: 260, phase: 3.9, size: 20 },
		],
	},
	L3: {
		gleam: { maskKey: 'part_L3_gemmask', periodMs: 3400, sweepMs: 480, angle: 0.5 },
		// no clean gear — the crystal interior does the work + sway + glints
		spins: defined(gemcore('L3', 0.0006)),
		rock: { amp: 0.03, periodMs: 2600 },
		sparkles: [
			{ x: 256, y: 140, phase: 0.7, size: 30 },
			{ x: 330, y: 260, phase: 2.9, size: 22 },
			{ x: 180, y: 300, phase: 4.6, size: 18 },
		],
	},
	L4: {
		gleam: { maskKey: 'part_L4_gemmask', periodMs: 2900, sweepMs: 500, angle: 0.42 },
		gears: defined(gear('L4', 1, 1550)),
		sparkles: [
			{ x: 268, y: 170, phase: 1.8, size: 28 },
			{ x: 210, y: 290, phase: 4.1, size: 20 },
		],
	},
	H1: {
		// orrery: base gear ticks, the plasma sun throbs violet
		gears: defined(gear('H1', -1, 1200)),
		glowPulse: { x: 256, y: 196, periodMs: 1500, maxSize: 100, tint: 0x9d7bff },
		sparkles: [{ x: 350, y: 210, phase: 0.9, size: 22 }],
	},
	H2: {
		// rocket: the cut part IS the exhaust flame — thruster flicker
		flame: SYMBOL_PARTS.H2?.gear && { ...SYMBOL_PARTS.H2.gear, key: 'part_H2_gear' },
		sparkles: [{ x: 330, y: 160, phase: 1.4, size: 26 }],
	},
	H3: {
		// astrolabe: the dial turns majestically, the accent gear ticks against it
		spins: defined(core('H3', 0.00028)),
		gears: defined(gear('H3', -1, 1300)),
	},
	H4: {
		// helmet cat: gentle head-tilt, glass glints, and he BLINKS
		blink: { key: 'part_H4_blink', periodMs: 3400, closedMs: 150 },
		rock: { amp: 0.038, periodMs: 2200 },
		sparkles: [
			{ x: 205, y: 205, phase: 0.4, size: 34 },
			{ x: 320, y: 300, phase: 2.6, size: 20 },
		],
	},
	H5: {
		// clockwork comet: crown gear ticks, stardust boils off the tail
		gears: defined(gear('H5', 1, 1100)),
		spins: defined(gemcore('H5', 0.0005)),
		rock: { amp: 0.025, periodMs: 1900 },
		sparkles: [
			{ x: 150, y: 380, phase: 0.2, size: 26 },
			{ x: 110, y: 320, phase: 1.9, size: 20 },
			{ x: 190, y: 430, phase: 3.7, size: 16 },
		],
	},
	W: {
		// wormhole: the vortex NEVER stops spinning; rim gear ticks along
		spins: defined(core('W', 0.0012)),
		gears: defined(gear('W', -1, 900)),
	},
	S: {
		// supernova: slow core rotation + periodic expanding burst ring
		spins: defined(core('S', 0.00045)),
		novaRing: { x: 256, y: 256, periodMs: 2100, maxSize: 470, tint: 0xffe9b0 },
	},
};
