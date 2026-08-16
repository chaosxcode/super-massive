import type { Messages } from '@lingui/core';

import { type Language } from './stateUrl.svelte';

// Plain catalog lookup. The catalogs are flat identity/label maps (no ICU
// plurals/interpolation anywhere in this game), and running them through
// @lingui/core's runtime `i18n._()` emitted an "Uncompiled message detected"
// console.warn per label — Stake requires a clean console at review, so the
// lingui runtime is bypassed. The `Messages` import is type-only (erased).
export const stateI18n = $state({
	locale: 'en' as Language,
	messages: {} as Record<string, unknown>,
});

export const stateI18nDerived = {
	init: (lang: Language, messages: Messages) => {
		stateI18n.locale = lang;
		stateI18n.messages = (messages ?? {}) as Record<string, unknown>;
	},
	translate: (value: string) => {
		const message = stateI18n.messages[value];
		return typeof message === 'string' && message.length > 0 ? message : value;
	},
};
