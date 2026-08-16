<script lang="ts">
	// First-impression splash shown once, right after the loading screen: the three
	// bonus cards (art + title only — no price/buttons) hovering over a blurred
	// view of the game. Click anywhere → cards zoom up and fly off into the game.
	import { onMount } from 'svelte';

	type Props = { ondismiss: () => void };
	const props: Props = $props();

	let leaving = $state(false);
	let ready = $state(false); // cards+titles reveal together, once art is loaded

	// asset base set by the app layout (works in dev AND under Stake's sub-path)
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
	const asset = (p: string) => `${A}${p}`;
	const CARDS = [
		{ img: asset('sprites/ui/buy_card_storm.webp'), title: 'DARK MATTER' },
		{ img: asset('sprites/ui/buy_card_risingtide.webp'), title: 'EVENT HORIZON' },
		{ img: asset('sprites/ui/buy_card_wrath.webp'), title: 'SINGULARITY' },
	];

	onMount(() => {
		// preload all card art; only reveal the cards once every image is ready so
		// the titles never appear before their artwork
		let loaded = 0;
		const done = () => {
			if (++loaded >= CARDS.length) ready = true;
		};
		CARDS.forEach((c) => {
			const im = new Image();
			im.onload = done;
			im.onerror = done;
			im.src = c.img;
		});
		// warm the bonus-confirm plaques + modal panel now (fire-and-forget, does
		// NOT gate the splash) so they're cached before the first PLAY click
		[
			'sprites/ui/buy_plaque_storm.webp',
			'sprites/ui/buy_plaque_tide.webp',
			'sprites/ui/buy_plaque_wrath.webp',
			'sprites/ui/modal_panel.webp',
		].forEach((p) => {
			const im = new Image();
			im.src = asset(p);
		});
		const fallback = setTimeout(() => (ready = true), 1500);
		return () => clearTimeout(fallback);
	});

	const dismiss = () => {
		if (leaving || !ready) return;
		leaving = true;
		setTimeout(() => props.ondismiss(), 820); // after the fly-off animation
	};
</script>

<div
	class="intro"
	class:leaving
	role="button"
	tabindex="0"
	aria-label="Continue to game"
	onclick={dismiss}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && dismiss()}
>
	<div class="intro-cards" class:ready>
		{#each CARDS as c, i (c.title)}
			<div class="intro-card" style="--i: {i};">
				<img src={c.img} alt={c.title} draggable="false" />
				<div class="intro-title">{c.title}</div>
			</div>
		{/each}
	</div>

	<div class="intro-hint" class:ready>CLICK ANYWHERE TO CONTINUE</div>
</div>

<style>
	.intro {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4vh;
		cursor: pointer;
		/* opaque-enough blurred cover applied INSTANTLY (no fade) so the game never
		   flashes between the loader and this splash */
		background: rgba(6, 20, 32, 0.62);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		transition:
			background 0.6s ease,
			backdrop-filter 0.6s ease;
	}
	/* on exit only the dark/blur backdrop clears — the cards stay opaque so you
	   actually SEE them fly up and off the top before the splash unmounts */
	.intro.leaving {
		background: rgba(6, 20, 32, 0);
		backdrop-filter: blur(0px);
		-webkit-backdrop-filter: blur(0px);
		pointer-events: none;
	}

	.intro-cards {
		display: flex;
		align-items: center;
		gap: clamp(14px, 3vw, 46px);
		opacity: 0;
		transition: opacity 0.45s ease;
	}
	.intro-cards.ready {
		opacity: 1;
	}
	.intro-card {
		width: clamp(135px, 19vw, 285px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		filter: drop-shadow(0 18px 44px rgba(0, 0, 0, 0.6));
		animation: float 3.2s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.4s);
		transition:
			transform 0.8s cubic-bezier(0.6, -0.3, 0.7, 0),
			opacity 0.75s ease;
	}
	.intro-card img {
		width: 100%;
		display: block;
		border-radius: 16px;
		user-select: none;
	}
	.intro-title {
		font-family: 'proxima-nova', -apple-system, 'Segoe UI', Roboto, sans-serif;
		font-weight: 800;
		font-size: clamp(0.95rem, 1.5vw, 1.45rem);
		letter-spacing: 0.04em;
		text-align: center;
		color: #ffb45e;
		text-shadow:
			0 2px 0 #1b1420,
			0 0 18px rgba(196, 64, 143, 0.55);
	}
	/* on click: each card zooms up + scales and flies off the top (staggered).
	   A keyframe animation (not a transition off the float) so it ALWAYS plays. */
	.intro.leaving .intro-card {
		animation: cardOut 0.62s cubic-bezier(0.45, -0.22, 0.72, 0) forwards;
		animation-delay: calc(var(--i) * 0.05s);
	}
	@keyframes cardOut {
		0% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translateY(-78vh) scale(1.6);
			opacity: 0;
		}
	}

	.intro-hint {
		font-family: 'proxima-nova', -apple-system, 'Segoe UI', Roboto, sans-serif;
		font-weight: 700;
		letter-spacing: 0.14em;
		font-size: clamp(0.8rem, 1.25vw, 1.1rem);
		color: #f4ead9;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.75);
		opacity: 0;
		transition: opacity 0.45s ease;
	}
	.intro-hint.ready {
		animation: pulse 1.7s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0) scale(1);
		}
		50% {
			transform: translateY(-13px) scale(1.04);
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.45;
		}
		50% {
			opacity: 1;
		}
	}

	@media (orientation: portrait), (max-width: 820px) {
		.intro-cards {
			gap: 10px;
		}
		.intro-card {
			width: clamp(96px, 29vw, 180px);
		}
	}
</style>
