import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

// gold/sweeps coins render as "GC"/"SC" (no $/locale). Accept every common
// spelling (XGC is the canonical Stake value; GC/GCX are forgiving aliases) so
// a typo'd or variant currency param still shows coins, never a $.
const NO_LOCALISATION_CURRENCY_MAP: Record<string, string> = {
	XGC: 'GC',
	XSC: 'SC',
	GC: 'GC',
	SC: 'SC',
	GCX: 'GC',
	SCX: 'SC',
};

// Official Stake Engine CurrencyMeta (rgs docs) — every real currency renders
// with ITS OWN symbol (never a blanket "$": USD $ / CAD CA$ / MXN MX$ are
// distinct), 0 decimals for JPY/IDR/KRW/VND/CLP, suffix codes get a space.
type CurrencyMeta = { symbol: string; decimals: number; symbolAfter?: boolean };
const CURRENCY_META: Record<string, CurrencyMeta> = {
	USD: { symbol: '$', decimals: 2 },
	CAD: { symbol: 'CA$', decimals: 2 },
	MXN: { symbol: 'MX$', decimals: 2 },
	BRL: { symbol: 'R$', decimals: 2 },
	CNY: { symbol: 'CN¥', decimals: 2 },
	JPY: { symbol: '¥', decimals: 0 },
	EUR: { symbol: '€', decimals: 2 },
	RUB: { symbol: '₽', decimals: 2 },
	PHP: { symbol: '₱', decimals: 2 },
	INR: { symbol: '₹', decimals: 2 },
	KRW: { symbol: '₩', decimals: 0 },
	TRY: { symbol: '₺', decimals: 2 },
	IDR: { symbol: 'Rp', decimals: 0 },
	DKK: { symbol: 'KR', decimals: 2, symbolAfter: true },
	PLN: { symbol: 'zł', decimals: 2, symbolAfter: true },
	VND: { symbol: '₫', decimals: 0, symbolAfter: true },
	CLP: { symbol: 'CLP', decimals: 0, symbolAfter: true },
	ARS: { symbol: 'ARS', decimals: 2, symbolAfter: true },
	PEN: { symbol: 'S/', decimals: 2, symbolAfter: true },
};

// bookEventAmount: is the amount or win numbers in the events of books, e.g. the amount in setTotalWin bookEvent
// {
// 	"index": 3,
// 	"type": "setTotalWin",
// 	"amount": 100
// },
// if betting on $1,   100 bookEventAmount equals to $1.    betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $1,    50 bookEventAmount equals to $0.5.  betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5
// if betting on $0.5, 100 bookEventAmount equals to $0.5.  betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $0.5,  50 bookEventAmount equals to $0.25. betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
	return stateBet.wageredBetAmount * betAmountMultiplier;
};

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

// Stake's display contract is deliberately asymmetric:
// - balance and selectable play amounts are fixed at exactly 2 decimals;
// - wins, round totals and spin wins show the exact useful value with up to 4
//   decimals and no forced trailing zeroes (0.017 stays 0.017, never 0.02).
// CurrencyMeta.decimals remains reference data only because the approval rule also
// applies to currencies whose normal convention is zero decimals.
const FIXED_FRACTION_DIGITS = 2;
const MAX_WIN_FRACTION_DIGITS = 4;

const fractionRangeFor = (fullPrecision: boolean) =>
	fullPrecision
		? { minimumFractionDigits: 0, maximumFractionDigits: MAX_WIN_FRACTION_DIGITS }
		: {
				minimumFractionDigits: FIXED_FRACTION_DIGITS,
				maximumFractionDigits: FIXED_FRACTION_DIGITS,
			};

const groupWithDigits = (
	value: number,
	digits: { minimumFractionDigits: number; maximumFractionDigits: number },
) =>
	numberToFloat(value).toLocaleString('en-US', {
		...digits,
	});

export const numberToCurrencyString = (value: number, options?: { fullPrecision?: boolean }) => {
	const cur = (stateBet.currency || '').toUpperCase();
	const coin = NO_LOCALISATION_CURRENCY_MAP[cur];
	const digits = fractionRangeFor(options?.fullPrecision ?? false);
	// Sweeps/gold coin currencies render amount-then-code ("10.00 GC"), never a
	// "$"/locale symbol. Social mode with a REAL currency (social=true&currency=USD)
	// falls through to normal currency formatting — a blanket "SC" misrenders it.
	if (coin) {
		return `${groupWithDigits(value, digits)} ${coin}`;
	}
	// Real currencies: official CurrencyMeta symbol; an unknown code falls back to
	// amount-then-code ("10.00 XXX").
	const meta = CURRENCY_META[cur] ?? { symbol: cur, decimals: 2, symbolAfter: true };
	// The gold win-font is a bitmap atlas WITHOUT €/¥/₽/₩/₺/ł… glyphs (Latin-1
	// letters + $ only). Any non-ASCII symbol would render as a missing glyph in
	// the Pixi win displays, so those currencies use the code-suffix format
	// ("10.00 EUR") — still unambiguous and per-currency distinct.
	const safeMeta = /^[\x20-\x7E]*$/.test(meta.symbol)
		? meta
		: { symbol: cur, decimals: meta.decimals, symbolAfter: true };
	const grouped = groupWithDigits(value, digits);
	return safeMeta.symbolAfter ? `${grouped} ${safeMeta.symbol}` : `${safeMeta.symbol}${grouped}`;
};

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	// Win values use variable precision, preserving meaningful sub-cent values up
	// to Stake's four-decimal display limit.
	return numberToCurrencyString(normalisedAmount, { fullPrecision: true });
};
