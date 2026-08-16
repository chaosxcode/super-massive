<script lang="ts" module>
	// fired when the dive finishes, so anything that hid itself for the duration
	// (the mascot) can come back.
	export type EmitterEventWaveTransition = { type: 'bonusWaveEnd' };
</script>

<script lang="ts">
	// EVENT HORIZON DIVE — the bonus-entry transition. The EHT flame-ring video
	// (same asset the in-game hole uses) races toward the camera as if the board
	// is falling past the horizon: ring zooms from a point to past-the-lens,
	// space vignettes to black, then a white-violet flash washes the reveal in.
	// DOM overlay over the canvas; `screen` blending kills the video's black so
	// only the burning ring shows. Fired on bonus BUY (ModalBuyBonusConfirm)
	// and natural scatter triggers (freeSpinTrigger handler).
	import { getContext } from '../game/context';
	import { SFX } from '../game/soundMap';

	const context = getContext();
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
	const DURATION = 5100; // keep the established timing contract (book events resume after)

	let playing = $state(false);
	let v = $state(0); // remount key so the video restarts every trigger
	let timer: ReturnType<typeof setTimeout> | undefined;

	context.eventEmitter.subscribeOnMount({
		bonusWave: () => {
			// owner 2026-07-28: NO transition video on bonus entry — play the
			// warp whoosh and hand off immediately (the plaque flow carries it)
			context.eventEmitter.broadcast({ type: 'soundOnce', name: SFX.waveTransition, forcePlay: true });
			context.eventEmitter.broadcast({ type: 'bonusWaveEnd' });
		},
	});
</script>

{#if playing}
	{#key v}
		<div class="horizon-dive" aria-hidden="true">
			<div class="space"></div>
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="ring"
				src={`${A}video/blackhole_ring.mp4`}
				autoplay
				muted
				playsinline
				loop
			></video>
			<div class="flash"></div>
		</div>
	{/key}
{/if}

<style>
	.horizon-dive {
		position: fixed;
		inset: 0;
		z-index: 45; /* above the game canvas, below the modals (confirm card) */
		pointer-events: none;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* space closes in around the dive */
	.space {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 50%, rgba(6, 2, 16, 0) 30%, rgba(6, 2, 16, 0.94) 78%);
		animation: closein 5.1s ease-in forwards;
	}
	@keyframes closein {
		0% { opacity: 0; }
		18% { opacity: 1; }
		88% { opacity: 1; }
		100% { opacity: 0; }
	}
	/* the ring races at the camera */
	.ring {
		width: min(62vw, 62vh);
		height: min(62vw, 62vh);
		mix-blend-mode: screen; /* video black disappears — only the fire shows */
		animation: dive 5.1s cubic-bezier(0.55, 0, 0.85, 0.4) forwards;
	}
	@keyframes dive {
		0% { transform: scale(0.05) rotate(-6deg); opacity: 0; }
		12% { opacity: 1; }
		62% { transform: scale(1.35) rotate(3deg); }
		88% { transform: scale(7.5) rotate(8deg); opacity: 1; }
		100% { transform: scale(11) rotate(10deg); opacity: 0; }
	}
	/* passing THROUGH the horizon: white-violet wash near the end */
	.flash {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 50%, #fff6e0 0%, #b9a4ff 45%, rgba(122, 76, 255, 0) 75%);
		opacity: 0;
		animation: flashout 5.1s linear forwards;
	}
	@keyframes flashout {
		0%, 74% { opacity: 0; }
		84% { opacity: 0.95; }
		94% { opacity: 0.4; }
		100% { opacity: 0; }
	}
</style>
