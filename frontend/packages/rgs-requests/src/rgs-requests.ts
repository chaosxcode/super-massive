import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { rgsFetcher } from 'rgs-fetcher';

export * from './types';

// --- local dev mock (?mock=true) -------------------------------------------
// When the app loads books into globalThis.__MOCK_BOOKS__ (only on ?mock=true),
// the RGS calls return synthetic responses so the game is fully playable with
// no server/session. Real builds never set the global, so this is inert.
type MockBook = { payoutMultiplier: number; events: unknown[] };
const getMockBooks = () =>
	(globalThis as unknown as { __MOCK_BOOKS__?: Record<string, MockBook[]> }).__MOCK_BOOKS__;

const MOCK_BALANCE = 100000;

const buildMockRound = (mode: string, amount: number) => {
	const books = getMockBooks();
	const list = books?.[mode] ?? books?.base ?? [];
	const book = list[Math.floor(Math.random() * list.length)];
	const payoutMultiplier = book?.payoutMultiplier ?? 0;
	return {
		roundID: 1,
		amount: amount * API_AMOUNT_MULTIPLIER,
		payout: Math.round(amount * payoutMultiplier * API_AMOUNT_MULTIPLIER),
		payoutMultiplier,
		active: false,
		mode,
		event: '0',
		state: book?.events ?? [],
	};
};

export const requestAuthenticate = async (options: {
	sessionID: string;
	rgsUrl: string;
	language: string;
}) => {
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/wallet/authenticate',
		variables: {
			sessionID: options.sessionID,
			language: options.language,
		},
	});

	return data;
};

export const requestEndRound = async (options: {
	sessionID: string;
	rgsUrl: string;
}) => {
	if (getMockBooks()) return { status: { statusCode: 'OK' }, balance: { amount: MOCK_BALANCE * API_AMOUNT_MULTIPLIER, currency: 'XGC' } }; // prettier-ignore
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/wallet/end-round',
		variables: {
			sessionID: options.sessionID,
		},
	});

	return data;
};

export const requestEndEvent = async (options: {
	sessionID: string;
	eventIndex: number;
	rgsUrl: string;
}) => {
	if (getMockBooks()) return { event: `${options.eventIndex}` };
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/bet/event',
		variables: {
			sessionID: options.sessionID,
			event: `${options.eventIndex}`,
		},
	});

	return data;
};

export const requestBet = async (options: {
	sessionID: string;
	currency: string;
	amount: number;
	mode: string;
	rgsUrl: string;
}) => {
	if (getMockBooks()) {
		return {
			status: { statusCode: 'OK' },
			balance: { amount: MOCK_BALANCE * API_AMOUNT_MULTIPLIER, currency: options.currency },
			round: buildMockRound(options.mode, options.amount),
		};
	}
	const data = await rgsFetcher.post({
		rgsUrl: options.rgsUrl,
		url: '/wallet/play',
		variables: {
			mode: options.mode,
			currency: options.currency,
			sessionID: options.sessionID,
			amount: options.amount * API_AMOUNT_MULTIPLIER,
		},
	});

	return data;
};

export const requestReplay = async (options: {
	game: string;
	version: string;
	mode: string;
	event: string;
	rgsUrl: string;
}) => {
	const data = await rgsFetcher.get({
		rgsUrl: options.rgsUrl,
		// @ts-ignore TODO: update the schema.ts
		url: `/bet/replay/${options.game}/${options.version}/${options.mode}/${options.event}`,
	});

	return data;
}