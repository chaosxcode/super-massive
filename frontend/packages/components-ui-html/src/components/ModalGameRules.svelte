<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	// asset base set by the app (works in dev AND under Stake's sub-path build)
	const A = (globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
	const panelBg = `${A}sprites/ui/modal_panel.webp`;
	const sym = (f: string) => `${A}sprites/symbols/${f}`;

	// every interactive button, depicted with its in-game art (Stake requires the
	// unlabeled icon buttons to be shown in the controls section)
	// Depicted with the LIVE HUD glyphs, not screenshots. The bar renders an inline
	// <svg> sprite of <symbol id="ic-…"> into the same document, so <use href="#ic-…">
	// here always matches what is actually on screen — the old btn_*.webp photos
	// showed the pre-Hacksaw buttons and went stale the moment the HUD changed.
	const CONTROLS = [
		{
			icon: 'ic-spin',
			name: 'Spin',
			text: 'starts a round (or press the Spacebar). While a round is playing it acts as the stop button.',
		},
		{ icon: 'ic-plus', name: 'Raise', text: 'raises your play amount to the next level.' },
		{ icon: 'ic-minus', name: 'Lower', text: 'lowers your play amount to the previous level.' },
		{
			icon: 'ic-coin',
			vb: '0 0 100 100',
			name: 'Bonus',
			text: 'opens the bonus menu. While a mode is armed it shows ACTIVE with the mode name and what each round costs; tap it again to switch back to normal play.',
		},
		{
			icon: 'ic-autoplay',
			name: 'Auto',
			text: 'choose a number of automatic rounds — you confirm before they run, and pressing Spin stops them. It shows the rounds remaining while running.',
		},
		{ icon: 'ic-hamburger', name: 'Menu', text: 'opens the options below.' },
		{ icon: 'ic-turbo', name: 'Turbo', text: 'faster spins while lit. Lives in the menu.' },
		{ icon: 'ic-table', name: 'Wins Table', text: 'symbol values and win rules. In the menu.' },
		{ icon: 'ic-info-ring', name: 'Game Rules', text: 'this window. In the menu.' },
		{ icon: 'ic-sliders', name: 'Settings', text: 'volume controls. In the menu.' },
		{ icon: 'ic-sound', name: 'Sound', text: 'mute or unmute the audio. In the menu.' },
		{ icon: 'ic-close', name: 'Close', text: 'closes the menu.' },
	];

	// Max win differs per game mode. These are the TRUE ceilings — the highest
	// payoutMultiplier present in each mode's production lookup table
	// (`math upload/lookUpTable_<mode>_0.csv`), not an aspirational cap. Stake
	// serves outcomes straight from those books, so any number here that the
	// books cannot reach is a review failure. Regenerate the math and these
	// values change together; they are not independent copy.
	// Stake approval requires these values to match the LUT ceilings exactly — no
	// rounding up or down. The exact published values are also the max_win values
	// in apps/acqua-alta/src/game/config.ts.
	const MODE_MAX_WIN = [
		{ name: 'Base game', max: '1,243.88×' },
		{ name: 'DARK MATTER', max: '984.49×' },
		{ name: 'THREE-WILD SHOT', max: '711.81×' },
		{ name: 'EVENT HORIZON', max: '1,822.75×' },
		{ name: 'EJECTA REACTOR', max: '2,999.11×' },
		{ name: 'SINGULARITY', max: '4,715.98×' },
	];

	// 3×3 example boards for the win / no-win illustration. `c` marks the
	// Red Quasar cells that (don't) form a cluster.
	const EXAMPLE_WIN = [
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L2.webp'), c: false },
		{ img: sym('symbol_H4.webp'), c: false },
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L1.webp'), c: false },
		{ img: sym('symbol_L2.webp'), c: false },
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L4.webp'), c: true },
	];
	const EXAMPLE_LOSE = [
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L2.webp'), c: false },
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L1.webp'), c: false },
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_H4.webp'), c: false },
		{ img: sym('symbol_L4.webp'), c: true },
		{ img: sym('symbol_L2.webp'), c: false },
		{ img: sym('symbol_L4.webp'), c: true },
	];
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<div class="pt-frame" style="background-image: url({panelBg});">
			<div class="pt-scroll">
				<h1 class="pt-title">SUPERMASSIVE</h1>
				<p class="pt-tag">Feed the black hole. It feeds you back.</p>

				<div class="pt-card">
					<h2>The Legend</h2>
					<p>
						At the edge of a supermassive black hole, Cadet Whiskers &mdash; a cat of questionable
						judgment and excellent whiskers &mdash; mines the impossible: clockwork relics and
						crystals that only form past the point of no return. Every winning cluster is pulled
						into the hole, and every feeding makes it stronger. Cross the Event Horizon and nothing
						resets &mdash; not the hole's hunger, and not your Gravity Multiplier.
					</p>
				</div>

				<div class="pt-card">
					<h2>How to Win</h2>
					<ul>
						<li>
							<b>Cluster wins</b> &mdash; land 5+ matching symbols touching horizontally or vertically.
						</li>
						<li>
							<b>Tumble</b> &mdash; winning symbols are pulled into the black hole and new ones drop
							in; chains keep winning.
						</li>
						<li>
							<b>Gravity Multiplier</b> &mdash; each winning cascade feeds the hole and climbs the ladder:
							&times;1 &rarr; &times;2 &rarr; &times;3 &rarr; &times;5 &rarr; &times;8 &rarr; &times;12
							&rarr; &times;20 &rarr; &times;30 &rarr; &times;40 &rarr; &times;50 &rarr; &times;75 &rarr;
							&times;100. It multiplies that cascade's wins and resets on the next base spin.
						</li>
						<li>
							<b>Wild Ejecta</b> &mdash; swallow a cluster of 6+ and the hole returns 1 Wormhole Wild
							to the board (9+ returns 2). In EJECTA REACTOR the Reactor is the only thing that fires
							Wilds.
						</li>
						<li>
							<b>Cat Rescue</b> &mdash; now and then the tether snaps and Cadet Whiskers is pulled
							in. He always claws back out, and the rescue pays an instant
							<b>20&times; to 250&times;</b> your play. It happens at most once in any round or free
							spins feature.
						</li>
						<li><b>Wormhole (Wild)</b> &mdash; substitutes for all winning symbols.</li>
						<li><b>Supernova (Scatter)</b> &mdash; triggers the Beyond the Horizon free spins.</li>
					</ul>
				</div>

				<div class="pt-card">
					<h2>Example: Winning vs Losing</h2>
					<div class="pt-examples">
						<div class="pt-example">
							<div class="pt-grid">
								{#each EXAMPLE_WIN as cell, i (i)}
									<img src={cell.img} alt="" class:in-cluster={cell.c} />
								{/each}
							</div>
							<p class="pt-ex-caption is-win">
								&#10003; WIN &mdash; 5 Red Quasars connect up/down/left/right, forming a winning
								cluster
							</p>
						</div>
						<div class="pt-example">
							<div class="pt-grid">
								{#each EXAMPLE_LOSE as cell, i (i)}
									<img src={cell.img} alt="" class:in-cluster={cell.c} />
								{/each}
							</div>
							<p class="pt-ex-caption is-lose">
								&#10007; NO WIN &mdash; the same 5 symbols touch only diagonally, so they never
								connect
							</p>
						</div>
					</div>
				</div>

				<div class="pt-card">
					<h2>Features</h2>
					<ul>
						<li>
							<b>DARK MATTER (1.25&times; the play amount)</b> &mdash; Supernovas appear far more often
							&mdash; Free Spins trigger over 60% more often. Stays active until you switch it off.
						</li>
						<li>
							<b>THREE-WILD SHOT (1.70&times; the play amount)</b> &mdash; one single spin that begins
							with exactly 3 Wormhole Wilds already fired onto the board. The Wilds are part of the board
							before anything is scored.
						</li>
						<li>
							<b>EVENT HORIZON (120&times; the play amount)</b> &mdash; guaranteed 12 Beyond the Horizon
							free spins. Past the horizon the Gravity Multiplier never resets and RATCHETS UP every
							free spin, win or not.
						</li>
						<li>
							<b>EJECTA REACTOR (225&times; the play amount)</b> &mdash; 15 free spins that open with
							3 Wormhole Wilds fired onto the board. Every winning cluster charges the Reactor &mdash;
							6 to 8 symbols adds one charge, 9 or more adds two. At 3 charges the hole fires 3 more
							Wilds and the meter resets. Charge carries over between free spins, so the Reactor can
							fire again and again.
						</li>
						<li>
							<b>SINGULARITY (400&times; the play amount)</b> &mdash; 15 free spins INSIDE the singularity:
							the ladder starts at &times;12, ratchets every spin, and the hole returns extra Wilds on
							every winning spin.
						</li>
					</ul>
				</div>

				<div class="pt-card">
					<h2>Free Spins Rules</h2>
					<ul>
						<li>
							<b>Trigger</b> &mdash; landing 4 or more Supernova scatters on one base-game spin
							awards <b>12 free spins</b>.
						</li>
						<li>
							<b>Retriggers</b> &mdash; landing 3 or more Supernovas during free spins adds
							<b>+4 free spins</b>. Retriggers can happen repeatedly.
						</li>
						<li>
							<b>The Event Horizon rule</b> &mdash; during free spins the Gravity Multiplier NEVER resets.
							It ratchets up one ladder step every free spin (win or not) and keeps climbing with every
							winning cascade, all the way to &times;100.
						</li>
						<li>
							<b>No respins</b> &mdash; this game awards no respins; instead every win tumbles (winning
							symbols are swallowed and new ones drop in) within the same spin until no new cluster forms.
						</li>
						<li>
							<b>EVENT HORIZON (120&times;)</b> &mdash; starts free spins with a 4-scatter trigger (12
							free spins).
						</li>
						<li>
							<b>SINGULARITY (400&times;)</b> &mdash; 15 free spins starting at ladder step &times;12,
							with extra Wild Ejecta on every winning spin.
						</li>
					</ul>
				</div>

				<div class="pt-card">
					<h2>Max Win by Game Mode</h2>
					<dl class="pt-maxwin">
						{#each MODE_MAX_WIN as mode (mode.name)}
							<div class="pt-maxwin-row">
								<dt>{mode.name}</dt>
								<dd>{mode.max}</dd>
							</div>
						{/each}
					</dl>
				</div>

				<div class="pt-card">
					<h2>Controls</h2>
					<div class="pt-controls">
						{#each CONTROLS as control (control.name)}
							<div class="pt-control">
								<svg
									class="pt-control-ic"
									viewBox={control.vb ?? '0 0 24 24'}
									role="img"
									aria-label="{control.name} button"><use href="#{control.icon}" /></svg
								>
								<p><b>{control.name}</b> &mdash; {control.text}</p>
							</div>
						{/each}
					</div>
				</div>

				<p class="pt-foot">
					RTP 96.50% (all modes) &middot; Max win varies by game mode (see above) &middot;
					Medium-high volatility
				</p>
				<p class="pt-disclaimer">
					Malfunction voids all wins and plays. A consistent internet connection is required. In the
					event of a disconnection, reload the game to finish any uncompleted rounds. The expected
					return is calculated over many plays. The game display is not representative of any
					physical device and is for illustrative purposes only. Winnings are settled according to
					the amount received from the Remote Game Server and not from events within the web
					browser. TM and &copy; 2026 Stake Engine.
				</p>
			</div>
		</div>
		{@render props.children()}
	</Popup>
{/if}

<style>
	.pt-frame {
		position: relative;
		z-index: 100; /* above Popup's click-to-close layer so clicks/scroll work */
		/* owner: tighter left/right margins so the panel holds the copy instead of
		   stretching the ornate border art across the screen. Matched to the Wins
		   Table so the two modals read as one set. Capped in px because the inner
		   content column is only ~1020px — past that the frame was just growing
		   around empty space. Phones override below. */
		width: min(78vw, 900px);
		height: min(84vh, 900px);
		margin: 0 auto;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		/* the ornate border art stretches with the frame, so the padding must
		   scale with the viewport too — fixed padding swallowed the whole panel
		   in the Popout S mini-player */
		padding: 0; /* content is pinned to the art's measured window below */
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		font-family:
			'proxima-nova',
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
		/* px-based floor: the html root font halves under 500px width for the HUD,
		   which made this rem/em text unreadably small on mobile (review finding) */
		font-size: clamp(14px, 3.9vw, 16px);
	}
	.pt-scroll {
		/* the ornate border stretches with the frame, so the window is a FIXED
		   FRACTION of the box on every screen size: top 15%, sides 13%, bottom
		   15.5% (measured from modal_panel.webp). Overflow scrolls. */
		position: absolute;
		inset: 15% 13% 15.5%;
		max-width: 1020px;
		margin: 0 auto;
		overflow-y: auto;
		overflow-x: hidden; /* a menu must never scroll in both directions (Stake rule) */
		padding-right: 6px;
		color: #f4ead9;
		text-align: left;
		scrollbar-width: thin;
		scrollbar-color: #ff9440 rgba(0, 0, 0, 0.2);
	}
	.pt-scroll::-webkit-scrollbar {
		width: 8px;
	}
	.pt-scroll::-webkit-scrollbar-thumb {
		background: #ff9440;
		border-radius: 8px;
	}
	.pt-title {
		text-align: center;
		font-size: clamp(18px, 4.6vw, 26px);
		letter-spacing: 0.06em;
		margin: 28px 0 2px;
		color: #ffb45e;
		text-shadow:
			0 2px 0 #1b1420,
			0 0 18px rgba(196, 64, 143, 0.55);
	}
	.pt-tag {
		text-align: center;
		color: #d9b8e8;
		margin: 0 0 12px;
		font-style: italic;
	}
	/* owner: NO nested boxes. Every section's text sits directly on the one main
	   panel; the h2 alone separates them. Only the bottom margin survives, as
	   section spacing. */
	.pt-card {
		background: none;
		border: 0;
		border-radius: 0;
		padding: 0;
		margin: 0 0 14px;
	}
	.pt-card h2 {
		color: #ff9440;
		font-size: 1.12em;
		margin: 0 0 7px;
		letter-spacing: 0.03em;
	}
	.pt-card p,
	.pt-card li {
		line-height: 1.5;
		font-size: 0.95em;
	}
	.pt-card ul {
		margin: 0;
		padding-left: 18px;
	}
	.pt-card li {
		margin-bottom: 6px;
	}
	.pt-card b {
		color: #ffd9ad;
	}
	/* per-mode max win: two columns that collapse to a single stacked list on
	   narrow phones, so the figure never wraps away from its mode name */
	.pt-maxwin {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 4px 18px;
		margin: 0;
	}
	.pt-maxwin-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		border-bottom: 1px dotted rgba(255, 148, 64, 0.25);
		padding-bottom: 3px;
	}
	.pt-maxwin dt {
		color: #ffd9ad;
		font-size: 0.95em;
	}
	.pt-maxwin dd {
		margin: 0;
		color: #fff;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	@media (max-width: 520px) {
		.pt-frame {
			width: calc(100vw - 10px);
			height: calc(100vh - 10px);
		}
		.pt-maxwin {
			grid-template-columns: minmax(0, 1fr);
		}
		/* owner: margins way in on phones — the ornate panel art was eating most of
		   the readable area. Top stays a little deeper than the sides because the
		   frame's crown is taller than its rails. */
		.pt-scroll {
			inset: 9% 6% 6%;
		}
		.pt-title {
			margin-top: 10px;
		}
	}
	.pt-control-ic {
		width: 34px;
		height: 34px;
		flex: none;
		color: #ffd9ad;
		/* The HUD's coin glyph paints with these tokens, which are declared on
		   #controls in HudBar's scoped styles and do NOT reach this modal — without
		   them the coin resolved to a flat black disc. Kept in sync with HudBar. */
		--gold-coin: #eebd52;
		--gold-coin-rim: #3d2107;
		--gold-coin-ink: #221204;
		--font-display: proxima-nova, sans-serif;
	}
	/* fine print keeps an absolute px floor so it stays legible on mobile */
	.pt-foot {
		text-align: center;
		color: #c9a9c4;
		font-size: max(0.85em, 12px);
		margin: 8px 0 0;
	}
	.pt-disclaimer {
		text-align: center;
		color: #b9a6c6;
		font-size: max(0.8em, 12px);
		line-height: 1.5;
		margin: 12px 0 0;
		padding: 10px 12px 0;
		border-top: 1px solid rgba(255, 148, 64, 0.25);
	}

	/* winning / losing combination examples */
	.pt-examples {
		display: flex;
		gap: 12px;
		justify-content: center;
		flex-wrap: wrap;
	}
	.pt-example {
		flex: 1 1 150px;
		max-width: 190px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.pt-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 3px;
		width: 100%;
		background: rgba(16, 9, 20, 0.6);
		border: 1px solid rgba(255, 148, 64, 0.35);
		border-radius: 10px;
		padding: 6px;
		box-sizing: border-box;
	}
	.pt-grid img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: contain;
		opacity: 0.38;
		border-radius: 6px;
		box-sizing: border-box;
	}
	.pt-grid img.in-cluster {
		opacity: 1;
		background: rgba(255, 122, 43, 0.16);
		outline: 2px solid #ff9440;
		outline-offset: -2px;
	}
	.pt-ex-caption {
		font-size: max(0.82em, 11px);
		line-height: 1.35;
		text-align: center;
		margin: 7px 0 0;
	}
	.pt-ex-caption.is-win {
		color: #9df2b9;
	}
	.pt-ex-caption.is-lose {
		color: #ff9f9f;
	}

	/* controls, each depicted with its in-game button art */
	.pt-controls {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.pt-control {
		display: flex;
		align-items: center;
		gap: 11px;
	}
	.pt-control p {
		margin: 0;
		line-height: 1.4;
		font-size: 0.92em;
	}
	.pt-control b {
		color: #ffd9ad;
	}
</style>
