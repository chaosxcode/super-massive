import { setContextEventEmitter, getContextEventEmitter } from 'utils-event-emitter';
import { setContextXstate, getContextXstate } from 'utils-xstate';
import { setContextLayout, getContextLayout } from 'utils-layout';
import { setContextApp, getContextApp } from 'pixi-svelte';
import { stateMeta } from 'state-shared';

import { eventEmitter, type EmitterEvent } from './eventEmitter';
import { stateXstate, stateXstateDerived } from './stateXstate';
import { stateLayout, stateLayoutDerived } from './stateLayout';
import { stateApp } from './stateApp';
import { betModeMeta } from './config';

import { stateGame, stateGameDerived } from './stateGame.svelte';
import { i18nDerived } from '../i18n/i18nDerived';

export const setContext = () => {
	// game-defined bet mode metadata (base / ante / bonus / superbonus) drives
	// the platform buy dialog, confirm step and the ante toggle button.
	stateMeta.betModeMeta = betModeMeta;
	setContextEventEmitter<EmitterEvent>({ eventEmitter });
	setContextXstate({ stateXstate, stateXstateDerived });
	setContextLayout({ stateLayout, stateLayoutDerived });
	setContextApp({ stateApp });
};

export const getContext = () => ({
	...getContextEventEmitter<EmitterEvent>(),
	...getContextLayout(),
	...getContextXstate(),
	...getContextApp(),
	stateGame,
	stateGameDerived,
	i18nDerived,
});
