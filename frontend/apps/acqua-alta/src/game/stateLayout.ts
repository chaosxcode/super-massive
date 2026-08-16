import { createLayout } from 'utils-layout';

import { hudBandHeight } from './hudLayout';
import { solveBoardFit } from './constants';

const base = createLayout({
	backgroundRatio: {
		normal: 1664 / 928,
		portrait: 928 / 1664,
	},
	mainSizesMap: {
		desktop: { width: 1422, height: 800 },
		tablet: { width: 1000, height: 1000 },
		landscape: { width: 1600, height: 900 },
		portrait: { width: 800, height: 1422 },
	},
});

export const stateLayout = base.stateLayout;

/**
 * THE board's solved rect, with the persistent HUD's band reserved.
 *
 * `createLayout` contain-fits the main box in the whole viewport, which draws the
 * board edge-to-edge and leaves the DOM control bar nowhere to go but on top of
 * the reels (Stake revision PDF, items 3 and 5). Reserving the band HERE — in the
 * one function every layer already derives from — keeps the canvas and the chrome
 * from ever disagreeing about where the board ends.
 *
 * Measure the HUD's `#controls`, never its seat: the SPIN disc overflows the seat
 * and the board has to clear the DISC (HUD_BAR_BLUEPRINT.md, Trap 1).
 */
const mainLayout = () =>
	solveBoardFit({
		base: base.stateLayoutDerived.mainLayout(),
		canvas: base.stateLayoutDerived.canvasSizes(),
		isStacked: base.stateLayoutDerived.isStacked(),
		band: hudBandHeight({
			width: base.stateLayoutDerived.canvasSizes().width,
			height: base.stateLayoutDerived.canvasSizes().height,
			stacked: base.stateLayoutDerived.isStacked(),
		}),
	});

export const stateLayoutDerived = {
	...base.stateLayoutDerived,
	mainLayout,
};
