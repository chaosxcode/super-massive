import { stateBet, stateUi, stateUrlDerived } from 'state-shared';
import { requestReplay } from 'rgs-requests';
import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import { betModeMeta } from './config';
import { eventEmitter } from './eventEmitter';
import type { Bet } from './typesBookEvent';

// Replay mode (MANDATORY for Stake Engine approval — docs-research/topics/10-gap-fe-config.md):
// the stock web-sdk auto-plays the replay book on mount, which fails the approval
// checklist. This app-level state machine adds, without touching shared packages:
//   - a Start Replay gate (PLAY button) showing game mode, base play amount,
//     cost multiplier, currency and the REAL total cost (base × costMultiplier),
//   - a PLAY AGAIN button at the end of the replay (replays the same book),
//   - an error state when GET /bet/replay/... fails,
//   - no path into normal play (UIReplay has no spin/buy/auto buttons; the gate
//     backdrop also swallows pointer events; ResumeBet.svelte skips its
//     auto-broadcast in replay mode).
// All copy is social-casino-safe: play amount / cost vocabulary only.

export type ReplayPhase = 'loading' | 'gate' | 'playing' | 'finished' | 'error';

export const stateReplay = $state({
	phase: 'loading' as ReplayPhase,
	modeKey: 'base',
	baseAmount: 1,
	costMultiplier: 1,
	currency: 'USD',
	payoutMultiplier: 0,
});

// The replay book is kept OUTSIDE $state on purpose: a deep reactive proxy over
// the book events would (a) leak in-place mutations done by handlers during a
// run into the next PLAY AGAIN run and (b) trip svelte's dev-mode ownership
// checks when components touch event-derived objects. Each playback gets a
// pristine structuredClone instead.
let replayBook: Bet | null = null;

// Social-casino restricted-wording safety: a real Stake replay URL passes
// currency=XSC / XGC (and the GCX/SCX variants), but the "X" prefix is a
// restricted token for social play and must never reach the screen. Strip it
// down to plain GC/SC (mirrors packages/utils-shared/amount.ts's
// NO_LOCALISATION_CURRENCY_MAP so replay matches the rest of the app). Any
// other currency (USD, EUR, …) is returned unchanged.
const normaliseCurrency = (code: string | null | undefined): string => {
	const match = (code ?? '').toUpperCase().match(/^X?(SC|GC)X?$/);
	return match ? match[1] : (code ?? '');
};

const modeMeta = () =>
	betModeMeta[stateReplay.modeKey.toLowerCase() as keyof typeof betModeMeta] ?? null;
const modeDisplayName = () => stateReplay.modeKey.toUpperCase();
const modeTitle = () => modeMeta()?.text?.title ?? '';
const totalCost = () => stateReplay.baseAmount * stateReplay.costMultiplier;
const winAmount = () => stateReplay.baseAmount * stateReplay.payoutMultiplier;
// Non-money values stay exact to Stake's four-decimal display limit without
// exposing floating-point noise (33.4, never 33.400000001).
const cleanNumber = (value: number) => (Number.isInteger(value) ? value : Number(value.toFixed(4)));
// PLAY AMOUNT / TOTAL PLAY are money — always 2 decimals ("1.00", never "1")
const formatAmount = (value: number) =>
	`${value.toFixed(2)} ${normaliseCurrency(stateReplay.currency)}`;
// TOTAL WIN uses the same approval contract as live win displays: preserve the
// useful value up to four decimals and drop trailing zeroes. Only balance and
// selectable play amounts stay fixed at two decimals.
const cleanWinNumber = (value: number) =>
	Number.isInteger(value) ? value : Number(value.toFixed(4));
const formatWinAmount = (value: number) =>
	`${cleanWinNumber(value)} ${normaliseCurrency(stateReplay.currency)}`;
// win multiplier for the finished panel, e.g. "37.3×" (matches the cost-multiplier "×" house style)
const formatMultiplier = (value: number) => `${cleanNumber(value)}×`;

export const stateReplayDerived = {
	modeMeta,
	modeDisplayName,
	modeTitle,
	totalCost,
	winAmount,
	formatAmount,
	formatWinAmount,
	formatMultiplier,
};

// `currency` is a documented replay URL param (optional) that stateUrlDerived has
// no getter for — read it straight off the page URL like stateUrl does internally.
const urlCurrency = () =>
	typeof window === 'undefined'
		? null
		: new URLSearchParams(window.location.search).get('currency');

export const initReplay = async () => {
	stateUi.config.mode = 'replay';
	stateReplay.phase = 'loading';

	// checklist defaults when currency/amount are absent: 1 USD, or 1 SC on social casinos.
	// normaliseCurrency strips the restricted "X" prefix so a currency=XSC replay URL
	// never surfaces "XSC" in the panel/ribbon/CURRENCY row.
	stateReplay.currency =
		normaliseCurrency(urlCurrency()) || (stateUrlDerived.social() ? 'SC' : 'USD');
	stateReplay.baseAmount = stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER || 1;
	stateReplay.modeKey = stateUrlDerived.mode() || 'base';
	stateReplay.costMultiplier = modeMeta()?.costMultiplier ?? 1;

	// mirror what components-shared/Authenticate.svelte seeds for replay — minus the
	// auto-play (it sets stateBet.betToResume immediately; we hold the book until PLAY)
	stateBet.currency = stateReplay.currency;
	stateBet.betAmount = stateReplay.baseAmount;
	stateBet.wageredBetAmount = stateReplay.baseAmount;
	stateBet.activeBetModeKey = stateReplay.modeKey;

	try {
		const data = await requestReplay({
			rgsUrl: stateUrlDerived.rgsUrl(),
			game: stateUrlDerived.game(),
			mode: stateUrlDerived.mode(),
			version: stateUrlDerived.version(),
			event: stateUrlDerived.event(),
		});

		// response shape: { payoutMultiplier: float x, costMultiplier: float, state: [...book events] }
		// (schema.ts lacks the /bet/replay path upstream, hence the loose typing)
		const replayData = data as unknown as {
			error?: unknown;
			payoutMultiplier?: number;
			costMultiplier?: number;
			state?: Bet['state'];
		};

		if (
			!replayData ||
			replayData.error ||
			!Array.isArray(replayData.state) ||
			replayData.state.length === 0
		) {
			throw replayData;
		}

		// the RGS returns the REAL cost multiplier; betModeMeta is only the fallback
		if (Number(replayData.costMultiplier) > 0) {
			stateReplay.costMultiplier = Number(replayData.costMultiplier);
		}
		stateReplay.payoutMultiplier = Number(replayData.payoutMultiplier) || 0;
		replayBook = {
			...replayData,
			amount: stateReplay.baseAmount,
			event: '0',
			active: true,
			mode: stateReplay.modeKey,
		} as unknown as Bet;
		stateReplay.phase = 'gate';
	} catch (error) {
		// keep the console clean (warn, not error) — ReplayGate renders the player-facing message
		console.warn('[replay] failed to load replay data', error);
		stateReplay.phase = 'error';
	}
};

// (Re)plays the SAME book. resumeGame() consumes stateBet.betToResume (sets it to
// null), so every run hands the actor a fresh deep copy — PLAY AGAIN just calls
// this again with another pristine clone.
export const startReplayPlayback = () => {
	if (!replayBook) return;
	stateBet.winBookEventAmount = 0;
	stateBet.betToResume = structuredClone(replayBook);
	stateReplay.phase = 'playing';
	// resumeBet → EnableGameActor → gameActor RESUME_BET → resumeGame/playGame/endGame
	// (end-round and bet-event requests are already skipped in replay by the shared packages)
	eventEmitter.broadcast({ type: 'resumeBet' });
};
