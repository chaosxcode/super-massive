import { locales } from 'config-lingui';
import { page } from '$app/state';

import { stateConfig } from './stateConfig.svelte';

export type Language = (typeof locales)[number];

export type Key =
	// keys for play
	| 'sessionID'
	| 'rgs_url'
	| 'lang'
	| 'currency'
	| 'device'
	| 'social'
	| 'demo'
	| 'mock'
	// keys for replay 
	| 'replay'
	| 'amount'
	| 'game'
	| 'mode'
	| 'version'
	| 'event'
	;

const getUrlSearchParam = (key: Key) => page.url.searchParams.get(key) as string;

// params for play
const lang = () => {
	// Social mode is English-only (Stake compliance) — via the launch param OR
	// the jurisdiction flag from authenticate.
	if (
		['true', '1'].includes(getUrlSearchParam('social') ?? '') ||
		stateConfig.jurisdiction.socialCasino
	)
		return 'en';
	return getUrlSearchParam('lang') === 'br' ? 'pt' : (getUrlSearchParam('lang') as Language) || 'en';
};
const sessionID = () => getUrlSearchParam('sessionID') || '';
const rgsUrl = () => getUrlSearchParam('rgs_url') || '';
// reviewers launch with either `social=true` or the `social=1` shorthand
const social = () => ['true', '1'].includes(getUrlSearchParam('social') ?? '');
// replay launches carry the currency in the URL (play mode gets it from authenticate)
const currency = () => getUrlSearchParam('currency') || '';
// local dev only: ?mock=true runs the game standalone with a fake RGS (no session)
const mock = () => getUrlSearchParam('mock') === 'true';

// params for replay
const replay = () => getUrlSearchParam('replay') === 'true';
const amount = () => Number(getUrlSearchParam('amount')) || 0;
const game = () => getUrlSearchParam('game') || '';
const version = () => getUrlSearchParam('version') || '';
const mode = () => getUrlSearchParam('mode') || '';
const event = () => getUrlSearchParam('event') || '';

export const stateUrlDerived = {
	// states for play
	lang,
	sessionID,
	rgsUrl,
	social,
	currency,
	mock,
	// states for replay
	replay,
	amount,
	game,
	mode,
	version,
	event,
};
