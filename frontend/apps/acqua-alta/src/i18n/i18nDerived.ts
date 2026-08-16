import { stateI18nDerived } from 'state-shared';

import { i18nDerived as i18nDerivedUiPixi } from 'components-ui-pixi';
import { i18nDerived as i18nDerivedUiHtml } from 'components-ui-html';

export const i18nDerived = {
	...i18nDerivedUiPixi,
	...i18nDerivedUiHtml,

	// COMPLIANCE OVERRIDES — these must come AFTER the spreads, which is the
	// whole point of them being here.
	//
	// `components-ui-html`'s i18nDerived only swaps gambling wording when
	// `social=true`; outside social mode it emits the literal strings 'BET',
	// 'BET MENU' and 'SELECT YOUR BET', and they reach the bet-amount modal.
	// SUPERMASSIVE is scrubbed of "bet"/"buy" EVERYWHERE, not just in social
	// mode — the HUD says PLAY AMOUNT / TOTAL PLAY and the bonus cards say
	// "Get Bonus" — so a reviewer sweeping for the word would find these.
	//
	// Overridden app-side rather than in the shared package on purpose: the
	// package is used by six other apps, and this is a SUPERMASSIVE rule, not
	// an SDK-wide one.
	bet: () => 'PLAY',
	betMenu: () => 'PLAY MENU',
	selectYourBet: () => 'SELECT YOUR PLAY',
	insufficientFunds: () =>
		'INSUFFICIENT BALANCE TO PLACE THIS PLAY. PLEASE ADD FUNDS OR LOWER THE PLAY LEVEL.',

	home: () => stateI18nDerived.translate('HOME'),
	notTranslated: () => stateI18nDerived.translate('NOT TRANSLATED'),
};
