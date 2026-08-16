import { stateConfig, stateI18nDerived, stateUrlDerived } from 'state-shared';

// In social (sweepstakes / Gold Coins) mode stake.us prohibits gambling terms.
// Social is EITHER the ?social= launch param OR the jurisdiction flag from
// authenticate — the param alone misses real social sessions.
const social = () => stateUrlDerived.social() || stateConfig.jurisdiction.socialCasino;

export const i18nDerived = {
	// This fork serves only SUPERMASSIVE, which is scrubbed of "bet" wording in
	// every session (not just social) — these strings are compliant unconditionally.
	bet: () => 'PLAY',
	max: () => stateI18nDerived.translate('MAX'),
	betMenu: () => 'PLAY MENU',
	selectYourBet: () => 'SELECT YOUR PLAY',
	confirm: () => stateI18nDerived.translate('CONFIRM'),
	masterVolume: () => stateI18nDerived.translate('MASTER VOLUME'),
	musicVolume: () => stateI18nDerived.translate('MUSIC VOLUME'),
	soundEffectVolume: () => stateI18nDerived.translate('SOUND EFFECT VOLUME'),
	autoSpins: () => stateI18nDerived.translate('AUTO SPINS'),
	numberOfRounds: () => stateI18nDerived.translate('NUMBER OF ROUNDS'),
	advanced: () => stateI18nDerived.translate('ADVANCED'),
	singleWinLimit: () => stateI18nDerived.translate('SINGLE WIN LIMIT'),
	lossLimit: () => stateI18nDerived.translate('LOSS LIMIT'),
	startAutoplay: () => stateI18nDerived.translate('START AUTOPLAY'),
	notification: () => stateI18nDerived.translate('NOTIFICATION'),
	autoSpinsStopInfo: () => stateI18nDerived.translate('AUTO PLAY HAS STOPPED DUE TO'),
	insufficientFunds: () =>
		'INSUFFICIENT BALANCE TO PLACE THIS PLAY. PLEASE ADD FUNDS OR LOWER THE PLAY LEVEL.',
	lossLimitReached: () => stateI18nDerived.translate('LOSS LIMIT REACHED'),
	singleWinLimitReached: () => stateI18nDerived.translate('SINGLE WIN LIMIT REACHED'),
	settings: () => stateI18nDerived.translate('SETTINGS'),
};
