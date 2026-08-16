// Single indirection between SEMANTIC game sounds and the audio-sprite keys in
// static/assets/audio/sounds.json (the FINAL Acqua Alta sprite — 21 cues from
// assets-src/audio/final/manifest.json).
//
// This file is the ONLY place that maps game meaning -> sprite key.

import type { MusicName, SoundEffectName } from './sound';

export const MUSIC = {
	base: 'bgm_main', // Eleven Music: cosmic clockwork theme
	freeSpin: 'bgm_bonus', // Eleven Music: past-the-horizon theme
} as const satisfies Record<string, MusicName>;

export const SFX = {
	// ui
	btnGeneral: 'sfx_ui_click',
	btnSpin: 'sfx_spin_click',
	buyConfirm: 'sfx_buy_confirm',
	// board
	reelStop: 'sfx_symbol_land',
	anticipation: 'sfx_anticipation_rumble',
	scatterLand1: 'sfx_scatter_chime',
	scatterLand2: 'sfx_scatter_chime',
	scatterLand3: 'sfx_scatter_chime',
	scatterLand4: 'sfx_scatter_chime',
	scatterLand5: 'sfx_scatter_chime',
	wildLand: 'sfx_gondola_creak',
	wildExplode: 'sfx_glass_shatter',
	clusterPop: 'sfx_cluster_pop',
	clusterCombine: 'sfx_glass_shatter',
	// tide / multiplier (bell + badge tick are pitch-laddered in Sound.svelte)
	tideSurge: 'sfx_tide_surge',
	tideBellToll: 'sfx_bell_toll',
	tideDrain: 'sfx_water_drain',
	badgePop: 'sfx_badge_pop',
	badgeTick: 'sfx_badge_tick',
	// wins
	winSmall: 'sfx_badge_pop',
	winLevelEnd: 'sfx_ui_click',
	bigWinSting: 'sfx_bigwin_sting',
	maxWinSting: 'sfx_maxwin_sting',
	bigWinCoinLoop: 'sfx_win_tally_loop',
	youWonPanel: 'sfx_bell_toll',
	// free spins
	scatterWin: 'sfx_scatter_chime',
	freeSpinSting: 'sfx_bonus_thunderclap',
	freeSpinIntroJingle: 'sfx_retrigger_peal',
	retriggerPeal: 'sfx_retrigger_peal',
	// poseidon vocalisations (timed to the mascot trident slam on big wins)
	poseidonGrunt: 'sfx_poseidon_grunt',
	poseidonYell: 'sfx_poseidon_yell',
	poseidonLaugh: 'sfx_poseidon_laugh',
	// swoosh each time the mascot waves the trident (mascot attack)
	tridentSwoosh: 'sfx_trident_swoosh',
	// Hades vocalisations, one per mascot clip (slam/smash/beam/tideraise)
	hadesGrunt: 'sfx_cat_trill', // cat vocals — the hole's favorite snack speaks
	hadesGrowl: 'sfx_cat_annoyed',
	hadesRoar: 'sfx_cat_yowl',
	hadesLaugh: 'sfx_cat_purr',
	// the bonus-buy wave wash transition
	waveTransition: 'sfx_horizon_dive',
} as const satisfies Record<string, SoundEffectName>;
