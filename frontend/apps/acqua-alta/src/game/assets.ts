// Final-art asset manifest (real-assets pass, 2026-06-10).
//
// All Venetian art lives under static/assets/sprites/{symbols,ui,particles};
// it was ingested from assets-src/images/final by /tmp/acqua-assets/
// process_images.py (LANCZOS downscale + PNG quantize). Symbols are single
// static PNGs; all animation is code-driven (see SymbolSprite).

export default {
	// Loading art is the only preload group. The game mounts after these two
	// lightweight WebPs are ready, then the remaining assets load behind it.
	loading_supermassive: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/loading_supermassive.webp', import.meta.url).href,
		preload: true,
	},
	loading_supermassive_portrait: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/loading_supermassive_portrait.webp', import.meta.url)
			.href,
		preload: true,
	},
	// ui / branding (the exact wordmark is also embedded in the loading art)
	logo: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/logo.webp', import.meta.url).href,
	},
	studio_logo: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/studio_logo.png', import.meta.url).href,
	},
	label_fade: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/label_fade.webp', import.meta.url).href,
	},
	btn_spin: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_spin.webp', import.meta.url).href,
	},
	btn_menu: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_menu.webp', import.meta.url).href,
	},
	btn_autoplay: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_autoplay.webp', import.meta.url).href,
	},
	btn_turbo: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_turbo.webp', import.meta.url).href,
	},
	btn_sound_on: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_sound_on.webp', import.meta.url).href,
	},
	btn_sound_off: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_sound_off.webp', import.meta.url).href,
	},
	btn_plus: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_plus.webp', import.meta.url).href,
	},
	btn_minus: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_minus.webp', import.meta.url).href,
	},
	btn_paytable: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_paytable.webp', import.meta.url).href,
	},
	btn_settings: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_settings.webp', import.meta.url).href,
	},
	btn_close: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_close.webp', import.meta.url).href,
	},
	btn_info: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/btn_info.webp', import.meta.url).href,
	},
	buy_icon_storm: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/buy_icon_storm.webp', import.meta.url).href,
	},
	pressToContinueText: {
		type: 'sprites',
		src: new URL('../../assets/sprites/pressToContinueText/MM_pressanywhere.json', import.meta.url)
			.href,
	},
	// backgrounds (landscape + portrait picks in Background.svelte)
	bg_base: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/bg_base.webp', import.meta.url).href,
	},
	bg_base_portrait: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/bg_base_portrait.webp', import.meta.url).href,
	},
	bg_bonus: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/bg_bonus.webp', import.meta.url).href,
	},
	bg_bonus_portrait: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/bg_bonus_portrait.webp', import.meta.url).href,
	},
	// symbols (10 game symbols + legacy H5 placeholder kept for the symbols story)
	symbol_H1: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_H1.webp', import.meta.url).href,
	},
	symbol_H2: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_H2.webp', import.meta.url).href,
	},
	symbol_H3: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_H3.webp', import.meta.url).href,
	},
	symbol_H4: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_H4.webp', import.meta.url).href,
	},
	symbol_H5: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_H5.webp', import.meta.url).href,
	},
	symbol_L1: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_L1.webp', import.meta.url).href,
	},
	symbol_L2: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_L2.webp', import.meta.url).href,
	},
	symbol_L3: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_L3.webp', import.meta.url).href,
	},
	symbol_L4: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_L4.webp', import.meta.url).href,
	},
	symbol_W: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_W.webp', import.meta.url).href,
	},
	symbol_S: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/symbol_S.webp', import.meta.url).href,
	},
	// tide overlays (pure-black additive tiles — black = transparent under add)
	overlay_caustic: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/overlay_caustic.webp', import.meta.url).href,
	},
	overlay_ripple: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/overlay_ripple.webp', import.meta.url).href,
	},
	overlay_spray: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/overlay_spray.webp', import.meta.url).href,
	},
	// rendered by Background from the first frame — must be preloaded
	overlay_rain: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/overlay_rain.webp', import.meta.url).href,
	},
	overlay_lantern: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/overlay_lantern.webp', import.meta.url).href,
	},
	particle_droplet: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/particle_droplet.webp', import.meta.url).href,
	},
	particle_bubble: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/particle_bubble.webp', import.meta.url).href,
	},
	// gold spark fleck — falling-ember ambience (Background firefall)
	particle_gold_fleck: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/particle_gold_fleck.webp', import.meta.url).href,
	},
	// brass badge master (tier-tinted in MultiplierGrid)
	badge_brass: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/badge_brass.webp', import.meta.url).href,
	},
	// depth gauge (brass column + needle)
	depth_gauge_body: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/depth_gauge_body.webp', import.meta.url).href,
	},
	// same column with the cyan tube darkened to hollow glass — the EMPTY base the
	// bright cyan fills up over as the tide rises
	depth_gauge_body_empty: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/depth_gauge_body_empty.webp', import.meta.url).href,
	},
	depth_gauge_needle: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/depth_gauge_needle.webp', import.meta.url).href,
	},
	// board chrome
	board_frame: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/board_frame.webp', import.meta.url).href,
	},
	reelsFrame: {
		type: 'sprites',
		src: new URL('../../assets/sprites/reelsFrame/reels_frame.json', import.meta.url).href,
	},
	// win plaques (4 distinct plates, copy rendered in-engine)
	plaque_grande: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/plaque_grande.webp', import.meta.url).href,
	},
	plaque_maestoso: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/plaque_maestoso.webp', import.meta.url).href,
	},
	plaque_acqua_granda: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/plaque_acqua_granda.webp', import.meta.url).href,
	},
	plaque_maxwin: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/plaque_maxwin.webp', import.meta.url).href,
	},
	// free-spin chrome
	fs_intro_panel: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/fs_intro_panel.webp', import.meta.url).href,
	},
	fs_outro_panel: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/fs_outro_panel.webp', import.meta.url).href,
	},
	fs_counter_plate: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/fs_counter_plate.webp', import.meta.url).href,
	},
	fs_retrigger_plate: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/fs_retrigger_plate.webp', import.meta.url).href,
	},
	fs_record_stamp: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/fs_record_stamp.webp', import.meta.url).href,
	},
	// symbol rig parts (generated by assets-src/extract_parts.py)
	part_H1_core: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H1_core.webp', import.meta.url).href,
	},
	part_H1_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H1_gear.webp', import.meta.url).href,
	},
	part_H2_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H2_gear.webp', import.meta.url).href,
	},
	part_H3_core: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H3_core.webp', import.meta.url).href,
	},
	part_H3_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H3_gear.webp', import.meta.url).href,
	},
	part_H4_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H4_gear.webp', import.meta.url).href,
	},
	part_H5_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H5_gear.webp', import.meta.url).href,
	},
	part_L1_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L1_gear.webp', import.meta.url).href,
	},
	part_L2_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L2_gear.webp', import.meta.url).href,
	},
	part_L3_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L3_gear.webp', import.meta.url).href,
	},
	part_L4_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L4_gear.webp', import.meta.url).href,
	},
	part_S_core: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/S_core.webp', import.meta.url).href,
	},
	part_S_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/S_gear.webp', import.meta.url).href,
	},
	part_W_core: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/W_core.webp', import.meta.url).href,
	},
	part_W_gear: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/W_gear.webp', import.meta.url).href,
	},
	part_L1_gemcore: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L1_gemcore.webp', import.meta.url).href,
	},
	part_L2_gemcore: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L2_gemcore.webp', import.meta.url).href,
	},
	part_L3_gemcore: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L3_gemcore.webp', import.meta.url).href,
	},
	part_L4_gemcore: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L4_gemcore.webp', import.meta.url).href,
	},
	part_H5_gemcore: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H5_gemcore.webp', import.meta.url).href,
	},
	part_H4_blink: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/H4_blink.webp', import.meta.url).href,
	},
	part_L1_gemmask: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L1_gemmask.webp', import.meta.url).href,
	},
	part_L2_gemmask: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L2_gemmask.webp', import.meta.url).href,
	},
	part_L3_gemmask: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L3_gemmask.webp', import.meta.url).href,
	},
	part_L4_gemmask: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/L4_gemmask.webp', import.meta.url).href,
	},
	part_gleam_bar: {
		type: 'sprite',
		src: new URL('../../assets/sprites/symbols/parts/gleam_bar.webp', import.meta.url).href,
	},
	frame_top: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_top.webp', import.meta.url).href,
	},
	frame_bottom: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_bottom.webp', import.meta.url).href,
	},
	frame_left: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_left.webp', import.meta.url).href,
	},
	frame_right: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_right.webp', import.meta.url).href,
	},
	frame_gear_tl: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_gear_tl.webp', import.meta.url).href,
	},
	frame_gear_tr: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_gear_tr.webp', import.meta.url).href,
	},
	frame_gear_bl: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_gear_bl.webp', import.meta.url).href,
	},
	frame_gear_br: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_gear_br.webp', import.meta.url).href,
	},
	frame_emblem_vortex: {
		type: 'sprite',
		src: new URL('../../assets/sprites/ui/frame_emblem_vortex.webp', import.meta.url).href,
	},
	// fonts — custom 'gold' bitmap font (face="gold"), generated from scratch with
	// the orange/amber gradient + chiseled cuts. Replaces the web-sdk SAMPLE
	// mm_gold/silver/purple fonts (sample assets are not approvable). The blur/
	// silver/purple variants were unused, so they're dropped entirely.
	goldFont: {
		type: 'font',
		src: new URL('../../assets/fonts/poseidon_gold/poseidon_gold.xml', import.meta.url).href,
	},
	// localised win/free-spin plates
	freeSpins: {
		type: 'sprites',
		src: new URL('../../assets/sprites/freeSpins/freeSpins.json', import.meta.url).href,
	},
	winSmall: {
		type: 'sprites',
		src: new URL('../../assets/sprites/winSmall/MM_Localisation_winsmall.json', import.meta.url)
			.href,
	},
	// celebration particles (gold flecks + murano shards fountain)
	particles: {
		type: 'spriteSheet',
		src: new URL('../../assets/sprites/particles/particles.json', import.meta.url).href,
	},
	// final Acqua Alta audio sprite (semantic mapping in soundMap.ts)
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
	},
} as const;
