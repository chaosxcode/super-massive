import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import { SYMBOL_SIZE, REEL_PADDING, SYMBOL_INFO_MAP, BOARD_DIMENSIONS } from './constants';
import { eventEmitter } from './eventEmitter';
import { SFX } from './soundMap';
import type { Bet, BookEvent, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import type { RawSymbol, SymbolState } from './types';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });
export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	// Bought features open on the buy-confirm cue.
	if (['wildshot', 'bonus', 'ejecta', 'superbonus'].includes(stateBet.activeBetModeKey)) {
		eventEmitter.broadcast({ type: 'soundOnce', name: SFX.buyConfirm });
	}
	if (bookEventsToRestore.length > 0) {
		const bookEvents = bookEventsToRestore;
		bookEventsToRestore = [];
		await restoreBonusSnapshot(bookEvents);
	}
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// resume bet — CONTRACT.md deviation 4: `createBonusSnapshot` does NOT exist
// as a book event (never emitted by the math, no handler registered). The
// pre-resume events are reserved here instead and replayed by playBet() right
// before the remaining book events run — same restore, no synthetic event.
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'freeSpinTrigger',
	'freeSpinRetrigger',
	'updateFreeSpin',
	'setTotalWin',
	// persistent flood restore (CONTRACT.md): tide + grid PERSIST in freegame
	'tideLevel',
	'updateGrid',
];

let bookEventsToRestore: BookEvent[] = [];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event ?? 0);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	bookEventsToRestore = bookEventsBeforeResume.filter((bookEvent) =>
		BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
	);

	return { ...betToResume, state: bookEventsAfterResume };
};

const restoreBonusSnapshot = async (bookEvents: BookEvent[]) => {
	function findLastBookEvent<T>(type: T) {
		return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
			| BookEventOfType<T>
			| undefined;
	}

	const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
	const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
	const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
	// persistent flood restore: replay the last known tideLevel/updateGrid state
	// without re-animating — water + gauge are SET instantly, the badge grid
	// re-renders from the full grid snapshot.
	const lastTideLevelEvent = findLastBookEvent('tideLevel' as const);
	const lastUpdateGridEvent = findLastBookEvent('updateGrid' as const);

	if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
	if (lastUpdateFreeSpinEvent) await playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
	if (lastSetTotalWinEvent) await playBookEvent(lastSetTotalWinEvent, { bookEvents });
	if (lastUpdateGridEvent) {
		eventEmitter.broadcast({ type: 'multiplierGridShow' });
		eventEmitter.broadcast({
			type: 'multiplierGridUpdate',
			grid: lastUpdateGridEvent.gridMultipliers,
		});

		// the grid snapshot encodes the water exactly as the live session showed
		// it at this checkpoint; the gauge re-pins to the last named mark (a
		// tideLevel can outrun the rows once fully submerged).
		const numRows = lastUpdateGridEvent.gridMultipliers[0].length;
		let rows = 0;
		for (let row = numRows - 1; row >= 0; row -= 1) {
			if (lastUpdateGridEvent.gridMultipliers.every((reel) => reel[row] >= 2)) rows += 1;
			else break;
		}
		if (rows > 0) {
			eventEmitter.broadcast({ type: 'waterPlaneSet', level: rows });
			if (lastTideLevelEvent) {
				eventEmitter.broadcast({
					type: 'depthGaugeSet',
					level: lastTideLevelEvent.level,
					markName: lastTideLevelEvent.markName,
				});
			}
		}
	}
};

// other utils
export const getSymbolX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

export const getSymbolKey = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.multiplier !== undefined) {
		return `${rawSymbol.name}_${rawSymbol.multiplier}` as keyof typeof SYMBOL_INFO_MAP;
	}
	return rawSymbol.name as keyof typeof SYMBOL_INFO_MAP;
};

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	const symbolKey = getSymbolKey({ rawSymbol });
	return SYMBOL_INFO_MAP[symbolKey][state];
};
