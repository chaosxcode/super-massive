<script lang="ts">
	// Ambient EMBER FIELD (owner 2026-07-27): faint flickering embers BORN OFF the lava
	// sea's crest line (not the screen edge) with a tiny spark-pop at birth, rising and
	// dissolving. Pure DOM/CSS — GPU-composited transform/opacity loops, screen-blended.
	// Sits under the mascot (z-5 vs his z-6), above the game canvas.
	import { getContext } from '../game/context';
	import { BOARD_SIZES, PORTRAIT_BOARD_DROP, FRAME_SIZES } from '../game/constants';

	const context = getContext();
	const L = context.stateLayoutDerived;
	const FRAME_W = FRAME_SIZES.width;
	const FRAME_H = FRAME_SIZES.height;

	// spawn line = the lava sea's crest (same math as LavaSea, incl. the portrait drop)
	const crestFromBottom = $derived.by(() => {
		const cs = L.canvasSizes();
		const ml = L.mainLayout();
		// ml.y, not cs.height/2 — the solver lifts the board to reserve the HUD band
		const frameBottomY = ml.y + ml.scale * ((ml.height / 2) * 1.01 + FRAME_H / 2 - ml.height / 2);
		const drop = L.isStacked() ? PORTRAIT_BOARD_DROP : 0;
		return Math.max(0, Math.round(cs.height - (frameBottomY - 22 + drop)));
	});

	interface Ember {
		left: number; // vw
		size: number; // px
		rise: number; // s — full climb duration
		delay: number; // s — negative = mid-flight at mount
		sway: number; // s
		swayAmp: number; // px
		peak: number; // max opacity
		hue: number; // 0 = deep orange … 1 = pale gold
	}
	const rnd = (a: number, b: number) => a + Math.random() * (b - a);
	const embers: Ember[] = Array.from({ length: 26 }, () => ({
		left: rnd(0, 100),
		size: rnd(2, 4.5),
		rise: rnd(9, 18),
		delay: -rnd(0, 18),
		sway: rnd(2.4, 4.6),
		swayAmp: rnd(6, 22),
		peak: rnd(0.22, 0.5),
		hue: Math.random(),
	}));
	const color = (h: number) =>
		h > 0.6 ? '210, 235, 255' : h > 0.25 ? '170, 190, 255' : '190, 150, 255';
</script>

<div class="ember-field" aria-hidden="true" style="--crest-b:{crestFromBottom}px;">
	{#each embers as e}
		<span
			class="rise"
			style="left:{e.left}vw; animation-duration:{e.rise}s; animation-delay:{e.delay}s;"
		>
			<span
				class="sway"
				style="animation-duration:{e.sway}s; animation-delay:{e.delay * 0.7}s; --amp:{e.swayAmp}px;"
			>
				<!-- spark-pop at birth: flashes during the first ~5% of each rise loop -->
				<span
					class="birth"
					style="animation-duration:{e.rise}s; animation-delay:{e.delay}s;
						background: radial-gradient(circle, rgba(235, 245, 255, 0.9) 0%, rgba({color(
						e.hue,
					)}, 0.5) 40%, rgba({color(e.hue)}, 0) 70%);"
				></span>
				<span
					class="dot"
					style="width:{e.size}px; height:{e.size}px; --peak:{e.peak};
						background: radial-gradient(circle, rgba({color(e.hue)}, 1) 0%, rgba({color(e.hue)}, 0) 70%);
						animation-duration:{e.sway * 0.53}s;"
				></span>
			</span>
		</span>
	{/each}
</div>

<style>
	.ember-field {
		position: fixed;
		inset: 0;
		z-index: 5;
		pointer-events: none;
		overflow: hidden;
		mix-blend-mode: screen;
	}
	.rise {
		position: absolute;
		bottom: var(--crest-b, -8px); /* born on the lava crest line */
		animation: ember-rise linear infinite;
		will-change: transform;
	}
	.birth {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 18px;
		height: 18px;
		margin: -9px 0 0 -9px;
		border-radius: 50%;
		opacity: 0;
		animation: ember-birth linear infinite;
	}
	@keyframes ember-birth {
		0% {
			opacity: 1;
			transform: scale(0.4);
		}
		4% {
			opacity: 0.9;
			transform: scale(1.5);
		}
		7% {
			opacity: 0;
			transform: scale(2);
		}
		100% {
			opacity: 0;
		}
	}
	.sway {
		display: block;
		animation: ember-sway ease-in-out infinite alternate;
	}
	.dot {
		display: block;
		border-radius: 50%;
		opacity: var(--peak, 0.4);
		animation: ember-flicker ease-in-out infinite alternate;
		filter: blur(0.4px);
	}
	@keyframes ember-rise {
		0% {
			transform: translateY(0);
		}
		100% {
			transform: translateY(-72vh);
		}
	}
	@keyframes ember-sway {
		from {
			transform: translateX(calc(var(--amp) * -1));
		}
		to {
			transform: translateX(var(--amp));
		}
	}
	@keyframes ember-flicker {
		from {
			opacity: calc(var(--peak, 0.4) * 0.3);
		}
		to {
			opacity: var(--peak, 0.4);
		}
	}
	/* embers dissolve as they climb — the field itself fades to nothing by ~60% up
	   the screen, so a dot never visibly pops out mid-air */
	.ember-field {
		-webkit-mask-image: linear-gradient(to top, #000 0%, #000 38%, transparent 62%);
		mask-image: linear-gradient(to top, #000 0%, #000 38%, transparent 62%);
	}
	@media (prefers-reduced-motion: reduce) {
		.ember-field {
			display: none;
		}
	}
</style>
