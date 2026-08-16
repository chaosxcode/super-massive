import { createSound } from 'utils-sound';

// Final Acqua Alta audiosprite (static/assets/audio/sounds.{ogg,mp3} +
// sounds.json) — 30 cues. OGG is listed first in sounds.json src: the loops
// (bgm_*, tally) are gapless there; mp3 is the fallback for browsers without
// vorbis. This union must match the sprite keys in sounds.json exactly — a
// name that is not in the sprite fails silently at runtime.
export type MusicName = 'bgm_main' | 'bgm_bonus';

export type SoundEffectName =
	| 'sfx_spin_click'
	| 'sfx_symbol_land'
	| 'sfx_cluster_pop'
	| 'sfx_glass_shatter'
	| 'sfx_tide_surge'
	| 'sfx_bell_toll'
	| 'sfx_badge_pop'
	| 'sfx_badge_tick'
	| 'sfx_water_drain'
	| 'sfx_gondola_creak'
	| 'sfx_scatter_chime'
	| 'sfx_anticipation_rumble'
	| 'sfx_bonus_thunderclap'
	| 'sfx_retrigger_peal'
	| 'sfx_bigwin_sting'
	| 'sfx_maxwin_sting'
	| 'sfx_win_tally_loop'
	| 'sfx_ui_click'
	| 'sfx_buy_confirm'
	| 'sfx_poseidon_grunt'
	| 'sfx_poseidon_yell'
	| 'sfx_poseidon_laugh'
	| 'sfx_trident_swoosh'
	// cat vocalisations — fired per mascot clip (see soundMap.ts hades*)
	| 'sfx_cat_trill'
	| 'sfx_cat_annoyed'
	| 'sfx_cat_yowl'
	| 'sfx_cat_purr'
	// bonus-buy wave wash transition
	| 'sfx_horizon_dive';

export type SoundName = MusicName | SoundEffectName;

const sound = createSound<SoundName>();

export { sound };
