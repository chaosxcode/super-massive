import paddingReels from './paddingReels';

// Exact highest payoutMultiplier present in each published production lookup table
// (`math upload/lookUpTable_<mode>_0.csv`, raw payout column / 100). Keep the
// platform config and bet-mode metadata on this one source so a rounded marketing
// value can never drift from the math package again.
export const modeMaxWin = {
	base: 1243.88,
	ante: 984.49,
	wildshot: 711.81,
	bonus: 1822.75,
	ejecta: 2999.11,
	superbonus: 4715.98,
} as const;

export default {
	// TODO: set real provider name before wiring anything to this field
	providerName: 'sample_provider',
	gameName: 'supermassive',
	gameID: 'supermassive',
	rtp: 0.965,
	numReels: 7,
	numRows: [7, 7, 7, 7, 7, 7, 7],
	// CONTRACT.md bet modes — names lowercase, case-sensitive everywhere
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.965,
			max_win: modeMaxWin.base,
		},
		ante: {
			cost: 1.25,
			feature: true,
			buyBonus: false,
			rtp: 0.965,
			max_win: modeMaxWin.ante,
		},
		// Costs below are the simulated fair prices, not round numbers picked by
		// hand. One spin with three Wilds is naturally worth 1.610x, so 1.70x is
		// what it can be sold for at 96.5% RTP; the old 25x placeholder would have
		// needed a 53.7x lookup-table weight factor to force RTP, which would have
		// divorced the published odds from the simulated game entirely.
		wildshot: {
			cost: 1.7,
			feature: false,
			buyBonus: true,
			rtp: 0.965,
			max_win: modeMaxWin.wildshot,
		},
		// Repriced 100x -> 120x (owner 2026-08-07). 12 free spins are naturally worth
		// 113.4x, so at 100x the lookup table had to suppress big wins ~15% to force
		// 96.5% RTP — the only mode whose served odds diverged from the honest
		// simulation. 120x needs a 115.8x mean, which it reaches undistorted.
		bonus: {
			cost: 120.0,
			feature: false,
			buyBonus: true,
			rtp: 0.965,
			max_win: modeMaxWin.bonus,
		},
		// 15 free spins are naturally worth 217.8x, so 225x prices in at a 0.990
		// weight factor — essentially undistorted.
		ejecta: {
			cost: 225.0,
			feature: false,
			buyBonus: true,
			rtp: 0.965,
			max_win: modeMaxWin.ejecta,
		},
		superbonus: {
			cost: 400.0,
			feature: false,
			buyBonus: true,
			rtp: 0.965,
			max_win: modeMaxWin.superbonus,
		},
	},
	symbols: {
		W: {
			paytable: null,
			special_properties: ['wild'],
		},
		L4: {
			paytable: [
				{
					'5': 0.33,
				},
				{
					'6': 0.77,
				},
				{
					'7': 1.2,
				},
				{
					'8': 1.64,
				},
				{
					'9': 2.08,
				},
				{
					'10': 3.85,
				},
				{
					'11': 5.62,
				},
				{
					'12': 7.39,
				},
				{
					'13': 9.15,
				},
				{
					'14': 18.55,
				},
				{
					'15': 27.95,
				},
				{
					'16': 37.35,
				},
				{
					'17': 46.75,
				},
				{
					'18': 56.14,
				},
				{
					'19': 65.54,
				},
				{
					'20': 74.94,
				},
			],
		},
		L1: {
			paytable: [
				{
					'5': 0.16,
				},
				{
					'6': 0.37,
				},
				{
					'7': 0.58,
				},
				{
					'8': 0.79,
				},
				{
					'9': 0.99,
				},
				{
					'10': 1.83,
				},
				{
					'11': 2.66,
				},
				{
					'12': 3.49,
				},
				{
					'13': 4.33,
				},
				{
					'14': 8.94,
				},
				{
					'15': 13.56,
				},
				{
					'16': 18.17,
				},
				{
					'17': 22.79,
				},
				{
					'18': 27.4,
				},
				{
					'19': 32.02,
				},
				{
					'20': 36.63,
				},
			],
		},
		H3: {
			paytable: [
				{
					'5': 0.83,
				},
				{
					'6': 1.95,
				},
				{
					'7': 3.08,
				},
				{
					'8': 4.2,
				},
				{
					'9': 5.32,
				},
				{
					'10': 9.82,
				},
				{
					'11': 14.32,
				},
				{
					'12': 18.81,
				},
				{
					'13': 23.31,
				},
				{
					'14': 41.39,
				},
				{
					'15': 59.47,
				},
				{
					'16': 77.56,
				},
				{
					'17': 95.64,
				},
				{
					'18': 113.72,
				},
				{
					'19': 131.8,
				},
				{
					'20': 149.88,
				},
			],
		},
		S: {
			paytable: null,
			special_properties: ['scatter'],
		},
		H4: {
			paytable: [
				{
					'5': 0.58,
				},
				{
					'6': 1.35,
				},
				{
					'7': 2.12,
				},
				{
					'8': 2.89,
				},
				{
					'9': 3.66,
				},
				{
					'10': 6.7,
				},
				{
					'11': 9.74,
				},
				{
					'12': 12.78,
				},
				{
					'13': 15.82,
				},
				{
					'14': 30.21,
				},
				{
					'15': 44.6,
				},
				{
					'16': 59.0,
				},
				{
					'17': 73.39,
				},
				{
					'18': 87.79,
				},
				{
					'19': 102.18,
				},
				{
					'20': 116.57,
				},
			],
		},
		L2: {
			paytable: [
				{
					'5': 0.19,
				},
				{
					'6': 0.46,
				},
				{
					'7': 0.72,
				},
				{
					'8': 0.98,
				},
				{
					'9': 1.24,
				},
				{
					'10': 2.26,
				},
				{
					'11': 3.28,
				},
				{
					'12': 4.3,
				},
				{
					'13': 5.32,
				},
				{
					'14': 11.22,
				},
				{
					'15': 17.12,
				},
				{
					'16': 23.03,
				},
				{
					'17': 28.93,
				},
				{
					'18': 34.83,
				},
				{
					'19': 40.73,
				},
				{
					'20': 46.63,
				},
			],
		},
		H1: {
			paytable: [
				{
					'5': 2.33,
				},
				{
					'6': 5.49,
				},
				{
					'7': 8.66,
				},
				{
					'8': 11.82,
				},
				{
					'9': 14.98,
				},
				{
					'10': 27.06,
				},
				{
					'11': 39.13,
				},
				{
					'12': 51.21,
				},
				{
					'13': 63.28,
				},
				{
					'14': 106.58,
				},
				{
					'15': 149.88,
				},
				{
					'16': 193.18,
				},
				{
					'17': 236.48,
				},
				{
					'18': 279.78,
				},
				{
					'19': 323.08,
				},
				{
					'20': 366.38,
				},
			],
		},
		H2: {
			paytable: [
				{
					'5': 1.33,
				},
				{
					'6': 3.08,
				},
				{
					'7': 4.82,
				},
				{
					'8': 6.57,
				},
				{
					'9': 8.32,
				},
				{
					'10': 15.4,
				},
				{
					'11': 22.48,
				},
				{
					'12': 29.56,
				},
				{
					'13': 36.63,
				},
				{
					'14': 64.71,
				},
				{
					'15': 92.78,
				},
				{
					'16': 120.86,
				},
				{
					'17': 148.93,
				},
				{
					'18': 177.0,
				},
				{
					'19': 205.08,
				},
				{
					'20': 233.15,
				},
			],
		},
		L3: {
			paytable: [
				{
					'5': 0.26,
				},
				{
					'6': 0.59,
				},
				{
					'7': 0.92,
				},
				{
					'8': 1.25,
				},
				{
					'9': 1.58,
				},
				{
					'10': 2.93,
				},
				{
					'11': 4.28,
				},
				{
					'12': 5.64,
				},
				{
					'13': 6.99,
				},
				{
					'14': 14.56,
				},
				{
					'15': 22.12,
				},
				{
					'16': 29.69,
				},
				{
					'17': 37.25,
				},
				{
					'18': 44.82,
				},
				{
					'19': 52.38,
				},
				{
					'20': 59.95,
				},
			],
		},
	},
	// Free spin trigger tables (math game_config.py freespin_triggers / CONTRACT.md):
	// scatters -> spins awarded; freegame values are the retrigger additions.
	// Anticipation starts from 3 scatters in the basegame.
	scatterTriggers: {
		basegame: { 4: 10, 5: 12, 6: 15, 7: 18, 8: 20 },
		freegame: { 3: 5, 4: 8, 5: 10, 6: 12, 7: 15, 8: 18 },
	},
	// REAL math reelstrips (BR0/FR0), see ./paddingReels.ts
	paddingReels,
};

// Bet mode metadata consumed by the platform UI (ModalBuyBonus / BonusCards /
// ModalBuyBonusConfirm / ButtonBuyBonus) via stateMeta.betModeMeta — applied in
// context.ts setContext(). Keys + `mode` values are the LOWERCASE math mode
// names (CONTRACT.md: case-sensitive everywhere incl. replay URLs).
//
// Copy rules: social-casino-safe — play / coins / underworld vocabulary only.
// - `ante` is type 'activate': a toggle. While active the buy-menu button
//   becomes DISABLE (ButtonBuyBonus), so the buy menu cannot be opened.
// - both 'buy' modes (>2x cost) route through ModalBuyBonusConfirm before
//   playing — the platform's built-in confirmation step.
export const betModeMeta = {
	base: {
		mode: 'base',
		costMultiplier: 1.0,
		type: 'default' as const,
		parent: '',
		children: '',
		assets: { icon: '', dialogImage: '', dialogVolatility: '', volatility: '', button: '' },
		text: {
			title: 'SUPERMASSIVE',
			dialog:
				'Standard play. The event horizon rises one level after every winning cascade, multiplying every cluster tile it swallows, and recedes again before the next spin.',
			button: '',
			betAmountLabel: '', // social-mode: 'bet'→'play'; the PLAY fallback is the compliant label
			tickerIdle: 'THE HORIZON IS RISING',
			tickerSpin: 'GRAVITY HOLDS YOU',
			bannerText: '',
		},
		maxWin: modeMaxWin.base,
	},
	ante: {
		mode: 'ante',
		costMultiplier: 1.25,
		type: 'activate' as const,
		parent: '',
		children: '',
		assets: {
			icon: new URL('../../assets/sprites/ui/btn_ante.webp', import.meta.url).href,
			dialogImage: new URL('../../assets/sprites/ui/btn_ante.webp', import.meta.url).href,
			dialogVolatility: '',
			volatility: '',
			button: '',
		},
		text: {
			title: 'DARK MATTER',
			// honesty: ANTE_SCATTER_MULT 1.19 yields a measured 1.62x trigger uplift
			// (0.513% -> 0.833%), not 2x — the copy must not overclaim
			dialog: 'Free Spins trigger over 60% more often. This mode stays on until you switch it off.',
			description: '60% MORE FS CHANCE\nStays on until switched off.',
			button: 'ACTIVATE',
			betAmountLabel: 'DARK MATTER',
			tickerIdle: 'DARK MATTER IS ACTIVE',
			tickerSpin: 'GRAVITY HOLDS YOU',
			bannerText: '',
		},
		maxWin: modeMaxWin.ante,
	},
	wildshot: {
		mode: 'wildshot',
		costMultiplier: 1.7,
		type: 'buy' as const,
		parent: '',
		children: '',
		assets: { icon: '', dialogImage: '', dialogVolatility: '', volatility: '', button: '' },
		text: {
			title: 'THREE-WILD SHOT',
			dialog: 'Play one spin with exactly 3 Wilds fired from the black hole onto the board.',
			description: 'ONE SPIN WITH 3 WILDS\nFired onto the board.',
			button: 'PLAY',
			betAmountLabel: 'THREE-WILD SHOT',
			tickerIdle: 'THREE WILDS ARE LOCKED ON',
			tickerSpin: 'THREE-WILD SHOT',
			bannerText: '',
		},
		maxWin: modeMaxWin.wildshot,
	},
	bonus: {
		mode: 'bonus',
		costMultiplier: 120,
		type: 'buy' as const,
		parent: '',
		children: '',
		assets: {
			icon: new URL('../../assets/sprites/ui/buy_icon_storm.webp', import.meta.url).href,
			dialogImage: new URL('../../assets/sprites/ui/buy_icon_storm.webp', import.meta.url).href,
			dialogVolatility: '',
			volatility: '',
			button: '',
		},
		text: {
			title: 'EVENT HORIZON',
			dialog:
				'Get 12 Free Spins. The Gravity Multiplier keeps climbing through the feature and never resets between spins.',
			description: '12 FREE SPINS\nThe multiplier never resets.',
			button: 'PLAY',
			tickerIdle: 'THE EVENT HORIZON AWAITS',
			tickerSpin: 'EVENT HORIZON ACTIVE',
			bannerText: '',
		},
		maxWin: modeMaxWin.bonus,
	},
	ejecta: {
		mode: 'ejecta',
		costMultiplier: 225,
		type: 'buy' as const,
		parent: '',
		children: '',
		assets: { icon: '', dialogImage: '', dialogVolatility: '', volatility: '', button: '' },
		text: {
			title: 'EJECTA REACTOR',
			dialog:
				'Start Free Spins with 3 Wilds. Winning clusters charge the Reactor. When it fills, the black hole fires 3 more Wilds onto the board.',
			description: 'START WITH 3 WILDS\nWin clusters to fire 3 more.',
			button: 'PLAY',
			betAmountLabel: 'EJECTA REACTOR',
			tickerIdle: 'THE REACTOR IS CHARGED',
			tickerSpin: 'EJECTA REACTOR ACTIVE',
			bannerText: '',
		},
		maxWin: modeMaxWin.ejecta,
	},
	superbonus: {
		mode: 'superbonus',
		costMultiplier: 400,
		type: 'buy' as const,
		parent: '',
		children: '',
		assets: {
			icon: new URL('../../assets/sprites/ui/buy_icon_granda.webp', import.meta.url).href,
			dialogImage: new URL('../../assets/sprites/ui/buy_icon_granda.webp', import.meta.url).href,
			dialogVolatility: '',
			volatility: '',
			button: '',
		},
		text: {
			title: 'SINGULARITY',
			dialog:
				'Get 15 Free Spins starting at x12. The multiplier keeps climbing and the black hole fires extra Wilds throughout the feature.',
			description: '15 FREE SPINS AT X12\nExtra Wilds fire from the black hole.',
			button: 'PLAY',
			tickerIdle: 'TARTARUS AWAITS',
			tickerSpin: 'SINGULARITY ACTIVE',
			bannerText: '',
		},
		maxWin: modeMaxWin.superbonus,
	},
};
