<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';
	import Game from '../components/Game.svelte';
	import ReplayAuthenticate from '../components/ReplayAuthenticate.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	let brandLoading = $state(true); // SPIN SLAUGHTER logo stinger (user branding)
	let brandFinishing = $state(false);
	let brandFinishTimer: ReturnType<typeof setTimeout> | undefined;
	const brandDone = () => {
		if (brandFinishing) return;
		brandFinishing = true;
		brandFinishTimer = setTimeout(() => (brandLoading = false), 180);
	};

	// SPIN SLAUGHTER studio logo video (static/spin-slaughter-logo.mp4). NOTE for
	// a Stake submission: 'slaughter' was flagged as violent-language reject risk
	// during the Poseidon compliance pass — user chose to ship it; revisit if a
	// reviewer objects.
	const brandLogoUrl = new URL('../../spin-slaughter-logo.mp4', import.meta.url).href;

	// The clip is 5.041s. Keep the safety timeout comfortably beyond its natural
	// end so the last frames are never cut off; onended owns the normal handoff.
	$effect(() => {
		if (brandLoading && !brandFinishing) {
			const safetyTimer = setTimeout(brandDone, 6500);
			return () => clearTimeout(safetyTimer);
		}
	});

	$effect(() => () => clearTimeout(brandFinishTimer));

	// Resolve the static asset base ONCE here (an app module, so import.meta.url is
	// correct in both dev and the inlined Stake build) and expose it globally so the
	// HTML modals in /packages can build asset URLs that work under Stake's sub-path.
	// (a literal /assets/... 404s on Stake; package-relative new URL 404s in dev.)
	if (typeof window !== 'undefined') {
		const base = new URL('../../assets/', import.meta.url).href;
		(globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ = base.endsWith('/')
			? base
			: base + '/';
		// NOTE: the self-hosted UI font (aliased 'proxima-nova') is loaded in
		// pixi-svelte preloadFont() — awaited before first render. No external loads.

		// local dev: ?mock=true loads real math books into a global so rgs-requests
		// returns synthetic spins (no RGS). Dynamic import → only fetched in mock,
		// never bundled into production.
		if (stateUrlDerived.mock()) {
			import('../game/mockBooks.json').then((m) => {
				const books = ((m as { default?: unknown }).default ?? m) as Record<string, unknown>;
				// All six modes now have real production books; the wildshot/ejecta
				// preview aliases are gone.
				(globalThis as unknown as { __MOCK_BOOKS__?: unknown }).__MOCK_BOOKS__ = books;
			});
		}
	}

	setContext();
</script>

<GlobalStyle>
	{#if stateUrlDerived.replay()}
		<!-- ?replay=true → app-level bootstrap: fetch /bet/replay (no authenticate /
			session calls) and HOLD the book at the ReplayGate until PLAY is pressed -->
		<ReplayAuthenticate>
			<LoadI18n {messagesMap}>
				<Game startupReady={!brandLoading} />
			</LoadI18n>
		</ReplayAuthenticate>
	{:else}
		<Authenticate>
			<LoadI18n {messagesMap}>
				<Game startupReady={!brandLoading} />
			</LoadI18n>
		</Authenticate>
	{/if}
</GlobalStyle>

{#if brandLoading}
	<!-- The opaque black layer remains solid during the video's short fade-out.
		Only after it is gone can the game loading screen begin animating. -->
	<div class="brand-loader" class:finishing={brandFinishing}>
		<video
			src={brandLogoUrl}
			autoplay
			muted
			playsinline
			preload="auto"
			onended={brandDone}
			onerror={brandDone}
		></video>
	</div>
{/if}

{@render props.children()}

<style>
	.brand-loader {
		position: fixed;
		inset: 0;
		z-index: 2147483647;
		background: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}
	.brand-loader video {
		width: min(70vw, 560px);
		max-height: 70vh;
		opacity: 1;
		transition: opacity 180ms linear;
	}
	.brand-loader.finishing video {
		opacity: 0;
	}
</style>
