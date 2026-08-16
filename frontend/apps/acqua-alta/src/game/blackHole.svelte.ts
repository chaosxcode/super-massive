// The black hole's CURRENT board-space position — layout-dependent (desktop:
// right of the board; stacked: centered underneath it). BlackHole.svelte owns
// the value; the spaghettify infall (SymbolSprite) and the tether read it.
import { BLACK_HOLE } from './constants';

export const holeState = $state({ x: BLACK_HOLE.x, y: BLACK_HOLE.y });
