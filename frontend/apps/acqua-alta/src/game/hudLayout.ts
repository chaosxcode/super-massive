/**
 * SUPERMASSIVE control bar — the hacksaw-ui-kit HUD geometry, expressed in JS.
 *
 * WHY JS AND NOT CSS `clamp()`: two consumers must agree on ONE number. The HUD
 * (HudBar.svelte) draws itself from these tokens, and the canvas layout solver
 * (stateLayout.ts) reserves `band` so the board can never be drawn behind a
 * control. A CSS clamp() the solver cannot read is exactly how a board ends up
 * behind a button. `clamp(a, b, c)` below is CSS's: `min(max(a, b), c)`.
 *
 * The numbers are the SHIPPED values from hacksaw-ui-kit/TOKENS.css — measured
 * off the Le Santa reference in code (see HUD_BAR_BLUEPRINT.md "Fidelity"), not
 * estimated. Portrait is the base and scales off the viewport WIDTH; landscape
 * is expressed as fractions of the SEAT, so one number (`barH`) drives the whole
 * cluster and the ratios hold at every stage width.
 *
 * ⚠️ TRAP 1 (blueprint): `barH` is the SEAT and it is a FIXED height. `band` —
 * what the solver reserves — is deliberately TALLER, because the SPIN disc
 * overflows the seat upward and the board must clear the DISC, not the seat it
 * pokes out of.
 */

const clamp = (min: number, value: number, max: number) => Math.min(Math.max(min, value), max);

export type HudViewport = { width: number; height: number; stacked: boolean };

export type HudTokens = {
	/** the dark seat's FIXED height (landscape) / the readout row (portrait) */
	barH: number;
	spinD: number;
	coinD: number;
	stepD: number;
	hamD: number;
	autoD: number;
	chevW: number;
	chipH: number;
	/** PLAY AMOUNT chip's minimum inner width (landscape only) */
	amtMin: number;
	barPad: number;
	barGap: number;
	coinGap: number;
	seatPadX: number;
	stepPadR: number;
	/** min width of the flex spacer that opens the middle of the landscape cluster */
	spacerMin: number;
	/** air kept between the hanging GET BONUS coin and the stage edge */
	edgePad: number;
	fsK: number;
	fsV: number;
	rowGap: number;
	padTop: number;
	/** portrait readout row height — fixed, so `band` can never disagree with the paint */
	roH: number;
	/** how far the SPIN disc pokes above (and below) the seat */
	spinOver: number;
	/** the RESERVED BAND: what the layout solver measures. Taller than the seat. */
	band: number;
	safeB: number;
	popout: boolean;
};

/**
 * `env(safe-area-inset-bottom)` is a CSS-only value, and the solver needs it in
 * px. Read it off a throwaway probe, memoised per viewport size (it only
 * changes on rotate / resize, which is also the only time the solver re-runs).
 */
let safeCacheKey = '';
let safeCacheValue = 0;
const safeAreaBottom = (key: string) => {
	if (typeof document === 'undefined' || !document.body) return 0;
	if (key === safeCacheKey) return safeCacheValue;
	const probe = document.createElement('div');
	probe.style.cssText =
		'position:fixed;left:0;bottom:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-bottom,0px);';
	document.body.appendChild(probe);
	safeCacheValue = Math.round(probe.getBoundingClientRect().height);
	probe.remove();
	safeCacheKey = key;
	return safeCacheValue;
};

/**
 * The Stake mini-player and any window that short. The kit's `body.popout`
 * block: every control shrinks BY TOKEN ALONE and NOTHING is dropped — the
 * popover holds the only entry points for Turbo and Settings, and the coin is
 * the only one for GET BONUS, so removing a control here makes a feature
 * unreachable, which is a review failure and not a layout choice.
 */
const isPopout = (vp: HudViewport) => !vp.stacked && (vp.width <= 560 || vp.height <= 300);

export const hudTokens = (vp: HudViewport): HudTokens => {
	const W = Math.max(1, vp.width);
	const H = Math.max(1, vp.height);
	const safeB = safeAreaBottom(`${W}x${H}`);

	if (vp.stacked) {
		// PORTRAIT / TABLET — fractions of the viewport WIDTH. No seat at all: only
		// the chip and the spin carry a surface, so nothing overflows anything.
		const spinD = clamp(86, W * 0.274, 136);
		const fsK = clamp(9, W * 0.03, 15);
		const fsV = clamp(11, W * 0.031, 17);
		const barPad = clamp(8, W * 0.03, 22);
		const rowGap = clamp(4, W * 0.016, 11);
		const padTop = clamp(2, W * 0.009, 7);
		// Fixed row height, generously larger than the two line boxes it holds
		// (label + value at line-height 1.06), so the reserved band is exact and
		// the type can still never clip.
		const roH = Math.round(fsK * 1.35 + fsV * 1.45);
		return {
			barH: clamp(38, H * 0.09, 54),
			spinD,
			coinD: clamp(44, W * 0.13, 66),
			stepD: clamp(40, W * 0.115, 58),
			hamD: clamp(40, W * 0.118, 60),
			autoD: clamp(38, W * 0.111, 56),
			chevW: 26,
			chipH: clamp(38, H * 0.09, 54),
			amtMin: 0,
			barPad,
			barGap: clamp(6, W * 0.016, 14),
			coinGap: clamp(6, W * 0.01, 14),
			seatPadX: 0,
			stepPadR: 0,
			spacerMin: 0,
			edgePad: 0,
			fsK,
			fsV,
			rowGap,
			padTop,
			roH,
			spinOver: 0,
			band: padTop + spinD + rowGap + roH + barPad + safeB,
			safeB,
			popout: false,
		};
	}

	const popout = isPopout(vp);
	// The kit's mini-player token block. Its gaps, paddings and chip minimum are
	// tightened from the kit's own numbers because SUPERMASSIVE's seat carries one
	// more readout than Paint Possession's did (the shared WIN / TOTAL PLAY slot):
	// at 400x225 with a win on screen the kit's values overflow the seat's
	// max-width by 39px. Nothing is DROPPED — everything just compresses, which is
	// the mini-player rule. See scratchpad/hudverify.mjs for the sum.
	// PHONE LANDSCAPE is a touch surface, not a mini-player, and the plain
	// landscape floor (46 -> a 57px spin) made every control roughly half its
	// portrait size — owner-reported as "the buttons all shrunk on mobile". A
	// rotated phone is short (H ~360-500) but WIDE, so it is not `popout`; it just
	// fell through to the desktop-landscape formula, which scales off height.
	// Give it its own floor so nothing lands under the 44px touch minimum.
	const touchLandscape = !popout && W >= 560 && H <= 520;
	const barH = popout
		? 30
		: touchLandscape
			? clamp(56, H * 0.15, 78)
			: H <= 420
				? clamp(38, H * 0.125, 52)
				: clamp(46, H * 0.102, 88);
	const spinD = popout ? 40 : barH * 1.25;
	const spinOver = Math.max(0, (spinD - barH) / 2);
	return {
		barH,
		spinD,
		coinD: popout ? 24 : barH * 1.03,
		stepD: popout ? 26 : barH * 1.15,
		hamD: popout ? 20 : barH * 0.53,
		autoD: popout ? 20 : barH * 0.69, // = 0.55x the spin
		chevW: popout ? 12 : barH * 0.3,
		chipH: popout ? 26 : barH * 0.78,
		amtMin: popout ? 44 : clamp(84, W * 0.1, 150),
		barPad: popout ? 5 : clamp(10, W * 0.012, 22),
		barGap: popout ? 4 : clamp(8, W * 0.011, 18),
		coinGap: popout ? 4 : clamp(10, W * 0.009, 20),
		seatPadX: popout ? 6 : clamp(10, W * 0.011, 20),
		stepPadR: popout ? 3 : clamp(4, W * 0.005, 9),
		spacerMin: popout ? 6 : 10,
		edgePad: popout ? 8 : 12,
		fsK: popout ? 7 : Math.max(9, barH * 0.185),
		fsV: popout ? 9.5 : Math.max(11, barH * 0.21),
		rowGap: 0,
		padTop: 0,
		roH: 0,
		spinOver,
		// ⚠️ THE RESERVED BAND — seat + the spin's overflow above and below it + 8px
		// of air. Never `barH`: the board must clear the DISC, not the seat.
		band: barH + spinOver * 2 + 8 + safeB,
		safeB,
		popout,
	};
};

/** What the canvas layout solver reserves at the bottom of the stage, in px. */
export const hudBandHeight = (vp: HudViewport) => hudTokens(vp).band;
