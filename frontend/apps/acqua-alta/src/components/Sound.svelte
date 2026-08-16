<script lang="ts" module>
	import { sound, type MusicName, type SoundEffectName, type SoundName } from '../game/sound';

	export type EmitterEventSound =
		| { type: 'soundMusic'; name: MusicName }
		| { type: 'soundOnce'; name: SoundEffectName; forcePlay?: boolean }
		| { type: 'soundLoop'; name: SoundEffectName }
		| { type: 'soundStop'; name: SoundName }
		| { type: 'soundFade'; name: SoundName; from: number; to: number; duration: number }
		| { type: 'soundScatterCounterIncrease' }
		| { type: 'soundScatterCounterClear' }
		// acqua_alta pitch ladders (design-final.json): Marangona bell +1 step
		// per tide level, badge tick +1 semitone per multiplier step
		| { type: 'soundTideBell'; level: number }
		| { type: 'soundBadgeTick'; step: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	import { waitForTimeout } from 'utils-shared/wait';
	import { SECOND } from 'constants-shared/time';
	import { stateBet } from 'state-shared';

	import { getContext } from '../game/context';
	import { MUSIC, SFX } from '../game/soundMap';

	const context = getContext();

	context.eventEmitter.subscribeOnMount({
		// ui
		soundBetMode: async ({ betModeKey }) => {
			if (betModeKey === 'SUPERSPIN') {
				// check if SUPERSPIN, when changing the bet mode.
				sound.players.once.play({ name: SFX.winLevelEnd });
				await waitForTimeout(SECOND);
				sound.players.music.play({ name: MUSIC.freeSpin });
			} else {
				sound.players.music.play({ name: MUSIC.base });
			}
		},
		soundPressGeneral: () => sound.players.once.play({ name: SFX.btnGeneral }),
		soundPressBet: () => sound.players.once.play({ name: SFX.btnSpin }),
		// scatterCounter
		soundScatterCounterIncrease: () => (context.stateGame.scatterCounter = context.stateGame.scatterCounter + 1), // prettier-ignore
		soundScatterCounterClear: () => (context.stateGame.scatterCounter = 0),
		// tide pitch ladders — playbackRate = 2^(steps/12), THE signature sound
		soundTideBell: ({ level }) => {
			sound.players.once.play({ name: SFX.tideBellToll, forcePlay: true });
			sound.players.once.rate({
				name: SFX.tideBellToll,
				rate: 2 ** (Math.min(Math.max(level - 1, 0), 12) / 12),
			});
		},
		soundBadgeTick: ({ step }) => {
			sound.players.once.play({ name: SFX.badgeTick, forcePlay: true });
			sound.players.once.rate({
				name: SFX.badgeTick,
				rate: 2 ** (Math.min(Math.max(step, 0), 18) / 12),
			});
		},
		// game
		soundMusic: ({ name }) => sound.players.music.play({ name }),
		soundLoop: ({ name }) => sound.players.loop.play({ name }),
		soundOnce: ({ name, forcePlay }) => sound.players.once.play({ name, forcePlay }),
		soundStop: ({ name }) => sound.stop({ name }),
		soundFade: async ({ name, duration, from, to }) => await sound.fade({ name, duration, from, to }), // prettier-ignore
	});

	onMount(() => {
		try {
		if (stateBet.activeBetModeKey === 'SUPERSPIN') {
			// check if SUPERSPIN, when resume bet and the bet is a super spin.
			sound.players.music.play({ name: MUSIC.freeSpin });
		} else {
			sound.players.music.play({ name: MUSIC.base });

			//How to control volume per soundfile(use fade)
			// sound.players.music.fade({ name: 'bgm_main', from: 0, to: 1, duration: 3000 });

			//How to control rate per soundfile
			// sound.players.music.rate({ rate: 2, name: 'bgm_main'}); // change play back rate(1: default, 0: slow, 1+ fasterm and higher pitch )
		}
		} catch (e) {
			console.warn('[sound] music start failed', e);
		}
	});
</script>
