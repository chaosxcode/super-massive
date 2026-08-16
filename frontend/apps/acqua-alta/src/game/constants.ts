import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';
import { SFX } from './soundMap';

export const SYMBOL_SIZE = 140;

export const REEL_PADDING = 0.53;

// initial board (padded top and bottom)
export const INITIAL_BOARD: RawSymbol[][] = [
	[{ name: 'L1' }, { name: 'H2' }, { name: 'L2' }, { name: 'L3' }, { name: 'H4' }, { name: 'L1' }],
	[{ name: 'L3' }, { name: 'L1' }, { name: 'H1' }, { name: 'L2' }, { name: 'L4' }, { name: 'L2' }],
	[{ name: 'H4' }, { name: 'L2' }, { name: 'W' }, { name: 'L1' }, { name: 'H3' }, { name: 'L3' }],
	[{ name: 'L2' }, { name: 'H5' }, { name: 'L3' }, { name: 'H2' }, { name: 'L1' }, { name: 'L4' }],
	[{ name: 'L4' }, { name: 'L3' }, { name: 'H4' }, { name: 'L1' }, { name: 'L2' }, { name: 'H1' }],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

/** Portrait/stacked: the whole board group (frame, reels, water, gauge, badges), the
 *  BLACK HOLE and the mascot all ride this many SCREEN px vertically. Game.svelte
 *  wraps the entire board Container in it and frameVortexScreenPoint() adds it, so
 *  ONE number moves cat, board, hole and tether together — they can never drift.
 *
 *  NEGATIVE = up. Was +44 (pushed down toward the spin button, 2026-07-27). The
 *  owner wants the group higher on the phone, but -90 clipped the mascot's whole
 *  head and torso off the top — only his boots showed. 0 removes the old drop
 *  (44px up) without losing him. Tune this single value; ~-20 is the next step up
 *  if it still sits low. */
export const PORTRAIT_BOARD_DROP = 20;

/** The supermassive black hole the board is falling into, in board coordinates:
 *  bottom-center, core mostly buried under the frame's bottom rail so its crest
 *  peeks into the last row. Every gravity visual (well arc, spaghettified
 *  symbols, accretion particles) converges on this point. The well radius is
 *  anchored to the flooded-row line at the GRID CORNERS so the book-flooded rows
 *  are always fully inside the arc (the mid-column bulge above the line is the
 *  lensing fringe, not a coverage change). */
export const BLACK_HOLE = {
	x: BOARD_SIZES.width + 215,
	y: BOARD_SIZES.height / 2,
};

/** Where the black hole's outermost visible ring bottoms out, in main coords.
 *  Derived from BlackHole.svelte's own numbers rather than eyeballed: the halo
 *  is drawn `coreR * 2.48` wide and squeezed to 0.75 vertically.
 *
 *  It uses the LADDER-TOP core radius on purpose. `coreR` swells with the
 *  gravity ladder (96 + level*7 + …), and during free spins the ladder ratchets
 *  EVERY spin — so anything parked below the hole has to clear it at its
 *  largest, or it gets overlapped halfway through the feature. */
const HOLE_MAX_CORE_R = 176;
export const BLACK_HOLE_RING_BOTTOM = BLACK_HOLE.y + HOLE_MAX_CORE_R * 0.75 * (2.48 / 2);

/** DESKTOP bonus plates: FREE SPINS in the bottom-LEFT corner of the frame
 *  border and TOTAL WIN in the bottom-RIGHT, with the ejecta meter between them.
 *  Both call THIS, so they sit on one rail at one scale and cannot drift apart.
 *
 *  The scale is solved, not assumed: the bottom rail is only ~100px thick and a
 *  full-size plate is ~130px, so the plate is fitted INSIDE the rail. */
export const bonusPlateColumn = (args: {
	board: { x: number; y: number };
	plateWidth: number;
	plateHeight: number;
}) => {
	const { board, plateWidth, plateHeight } = args;
	// The bottom rail of the frame, in MAIN coords. FRAME_GEO is declared below,
	// so the rail is recomputed here from the same inputs rather than imported
	// upwards — see FRAME_GEO for the canonical version.
	const railTop = board.y + BOARD_SIZES.height * 0.51;
	const railHeight = 141 * ((BOARD_SIZES.width * 1.02) / 722) * 0.72;
	const railMid = railTop + railHeight / 2;
	const frameHalfWidth = BOARD_SIZES.width * 0.51 + 137 * ((BOARD_SIZES.height * 1.02) / 642) * 0.72;

	// Fit the plate INSIDE the rail's thickness rather than assuming it fits —
	// the rail is ~100px and a full-size plate is ~130px.
	const scale = Math.max(0.45, Math.min(1, (railHeight * 0.94) / plateHeight));
	const width = plateWidth * scale;
	const y = railMid - (plateHeight * scale) / 2;
	const margin = SYMBOL_SIZE * 0.06;

	return {
		scale,
		// bottom-LEFT corner of the border
		freeSpins: { x: board.x - frameHalfWidth + margin, y },
		// bottom-RIGHT corner of the border
		totalWin: { x: board.x + frameHalfWidth - margin - width, y },
	};
};

/** The frame is now drawn as FOUR BAND SPRITES + animated corner gears +
 *  the spinning crown vortex (owner: "thinner, cut it up, make it move").
 *  Bands are the chunky art's rails, slimmed on their thickness axis. All
 *  geometry derives from the board opening + the art's measured band sizes. */
const FRAME_THIN = 0.72; // thickness squeeze on every rail
const OPEN_X = (BOARD_SIZES.width * 1.02) / 2; // opening half-extents
const OPEN_Y = (BOARD_SIZES.height * 1.02) / 2;
const SX_TOP = (OPEN_X * 2) / 722; // art opening span 722px wide
const SY_SIDE = (OPEN_Y * 2) / 642; // art opening span 642px tall
export const FRAME_GEO = {
	openX: OPEN_X,
	openY: OPEN_Y,
	topW: 995 * SX_TOP,
	topH: 221 * SX_TOP * FRAME_THIN,
	botH: 141 * SX_TOP * FRAME_THIN,
	sideH: 642 * SY_SIDE,
	sideW: 137 * SY_SIDE * FRAME_THIN,
};
// Single source of truth for the crown-vortex center in board/main coordinates.
// BoardFrame draws every vortex sprite at boardLayout() + this offset.
export const FRAME_VORTEX_OFFSET = {
	x: 0,
	y: -FRAME_GEO.openY - FRAME_GEO.topH * 0.55,
};

/** THE shared anchor, in SCREEN pixels: the exact center of BoardFrame's crown
 *  vortex on every layout. The pixi sprite, the DOM mascot's boot, and the tether
 *  rope's fixed end all resolve to this one point, so no layer may re-derive it
 *  from its own copy of the layout math or from a CSS percentage.
 *
 *  Derivation: MainContainer maps a main-space point p to screen as
 *  mainLayout.{x,y} + scale * (p - mainSize/2), and Game.svelte rides the whole
 *  board group PORTRAIT_BOARD_DROP unscaled screen px lower when stacked.
 *  NOTE: read `main.y`, never `canvas.height / 2` — the solver lifts the board
 *  off centre to reserve the HUD band (see solveBoardFit). */
export const frameVortexScreenPoint = (layout: {
	canvasSizes: () => { width: number; height: number };
	mainLayout: () => { x: number; y: number; scale: number };
	isStacked: () => boolean;
}) => {
	const main = layout.mainLayout();
	return {
		x: main.x + main.scale * FRAME_VORTEX_OFFSET.x,
		y: main.y + (layout.isStacked() ? PORTRAIT_BOARD_DROP : 0) + main.scale * FRAME_VORTEX_OFFSET.y,
	};
};

/** Vertical reach of everything BoardFrame actually paints, measured from the
 *  board's centre, in MAIN units. Not symmetric: the top rail is taller than the
 *  bottom one, and the corner gears (d=118, drawn at botH*0.5) hang lower than
 *  the bottom rail does. This is the box the HUD must never cover. */
export const FRAME_EXTENT = {
	up: FRAME_GEO.openY + FRAME_GEO.topH,
	down: Math.max(FRAME_GEO.openY + FRAME_GEO.botH, FRAME_GEO.openY + FRAME_GEO.botH * 0.5 + 59),
};

/** Air kept above the frame so the crown vortex's glow is never clipped. */
export const BOARD_TOP_PAD = 4;

/** The bonus HUD's two brass plaques (FREE SPINS + TOTAL WIN) in STACKED
 *  layouts: one two-up row, `gap` apart, centred on the board and lifted clear
 *  of the tumble-win plate below it. They used to be stacked vertically on top of
 *  each other AND on top of the tumble plate (revisions PDF, item 5); side by
 *  side they fit inside the portrait stage down to a 320px-wide phone. */
export const BONUS_PLAQUE = {
	pairScale: 0.85,
	gap: SYMBOL_SIZE * 0.2,
	/** the row's BOTTOM sits this many symbol-widths above the board's top edge.
	 *  owner: 0 — the plates sit DIRECTLY on the board's top corners (FREE SPINS
	 *  right, TOTAL WIN left, aligned horizontally). 1.25 left them floating. */
	pairLift: 0,
};

/** THE RESERVED BAND, applied to the solved main layout.
 *
 *  The HUD is DOM over the canvas, so nothing stops a control being painted on
 *  top of the reels — which is exactly what the Stake reviewer screenshotted at
 *  Popout S (400x225). The fix belongs in ONE place: the layout solver. Shrink
 *  and/or lift the main layout until the drawn frame clears `hudBandHeight()`,
 *  and every consumer of mainLayout() (board, frame, black hole, tumble board,
 *  multipliers, the bonus plaques, the DOM mascot, the ember field and the
 *  tether rope) follows without knowing the HUD exists.
 *
 *  It is a NO-OP wherever the board already clears the band — portrait on a tall
 *  phone keeps its owner-tuned placement untouched. */
export const solveBoardFit = <T extends { x: number; y: number; scale: number }>(args: {
	base: T;
	canvas: { width: number; height: number };
	isStacked: boolean;
	band: number;
}): T => {
	const { base, canvas, isStacked, band } = args;
	const drop = isStacked ? PORTRAIT_BOARD_DROP : 0;
	const avail = Math.max(1, canvas.height - band - BOARD_TOP_PAD);
	const scale = Math.min(base.scale, avail / (FRAME_EXTENT.up + FRAME_EXTENT.down));

	let y = base.y;
	// 1. the frame's bottom must clear the band's top edge
	const overshoot = y + drop + scale * FRAME_EXTENT.down - (canvas.height - band);
	if (overshoot > 0) y -= overshoot;
	// 2. …and lifting it must never push its top off the stage (the scale cap
	//    above already guarantees this fits; kept as a floor, not a nudge)
	const short = BOARD_TOP_PAD - (y + drop - scale * FRAME_EXTENT.up);
	if (short > 0) y += short;

	return { ...base, y, scale };
};
export const FRAME_SIZES = {
	width: 2 * (OPEN_X + FRAME_GEO.sideW),
	height: 2 * OPEN_Y + FRAME_GEO.topH + FRAME_GEO.botH,
};

export const BACKGROUND_RATIO = 1664 / 928;
export const PORTRAIT_BACKGROUND_RATIO = 928 / 1664;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const SPIN_OPTIONS_SHARED = {
	reelFallInDelay: 80,
	reelPaddingMultiplierNormal: 1.25,
	reelPaddingMultiplierAnticipated: 18,
	reelFallOutDelay: 145,
};

// speeds retuned for the 5x4 BIG-symbol board (140px cells — the 80px-era
// values made a full spin cycle take 7+ seconds)
export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 6.5,
	symbolFallInInterval: 16,
	symbolFallInBounceSpeed: 0.22,
	symbolFallInBounceSizeMulti: 0.5,
	symbolFallOutSpeed: 6.5,
	symbolFallOutInterval: 10,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 12,
	symbolFallInInterval: 0,
	symbolFallInBounceSpeed: 0.3,
	symbolFallInBounceSizeMulti: 0.25,
	symbolFallOutSpeed: 12,
	symbolFallOutInterval: 0,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

// All symbol states render the SAME static sprite; the state look (breathing
// idle, squash-settle land, glow-pulse win, dimmed post-win, scale/fade
// explosion) is code-driven in SymbolSprite.svelte. Swapping in final art is
// a file replacement in static/assets/sprites/symbols/ (see assets.ts).
const SYMBOL_SIZE_RATIOS = { width: 0.94, height: 0.94 };

const symbolInfo = (assetKey: string) => {
	const sprite = { type: 'sprite', assetKey, sizeRatios: SYMBOL_SIZE_RATIOS } as const;
	return {
		static: sprite,
		spin: sprite,
		land: sprite,
		win: sprite,
		postWinStatic: sprite,
		explosion: sprite,
	} as const;
};

export const SYMBOL_INFO_MAP = {
	H1: symbolInfo('symbol_H1'),
	H2: symbolInfo('symbol_H2'),
	H3: symbolInfo('symbol_H3'),
	H4: symbolInfo('symbol_H4'),
	H5: symbolInfo('symbol_H5'), // legacy sample symbol, kept for the symbols story
	L1: symbolInfo('symbol_L1'),
	L2: symbolInfo('symbol_L2'),
	L3: symbolInfo('symbol_L3'),
	L4: symbolInfo('symbol_L4'),
	W: symbolInfo('symbol_W'),
	S: symbolInfo('symbol_S'),
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: SFX.scatterLand1,
	2: SFX.scatterLand2,
	3: SFX.scatterLand3,
	4: SFX.scatterLand4,
	5: SFX.scatterLand5,
} as const;
