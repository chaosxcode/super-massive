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
	const sym = (f: string) => `${A}sprites/symbols/${f}`;
	const panelBg = `${A}sprites/ui/modal_panel.webp`;
	// Pays are ×-play-amount at the LOCKED math scale (engine.py PAYS × the
	// calibrated PAY_SCALE, truncated to bet-cents) — verified against the
	// shipped books' winWithoutMult values. Every valid size is disclosed: a 5x4
	// board can form clusters from 5 through 20. Four compact blocks keep all 16
	// sizes readable without introducing horizontal scrolling in Popout S.
	const CLUSTER_SIZES = Array.from({ length: 16 }, (_, index) => `${index + 5}`);
	const CLUSTER_GROUPS = Array.from({ length: 4 }, (_, index) =>
		CLUSTER_SIZES.slice(index * 4, index * 4 + 4),
	);
	const SYMBOLS = [
		{
			img: sym('symbol_H1.webp'),
			name: 'Stellar Orrery',
			pays: [
				'2.33',
				'5.49',
				'8.66',
				'11.82',
				'14.98',
				'27.06',
				'39.13',
				'51.21',
				'63.28',
				'106.58',
				'149.88',
				'193.18',
				'236.48',
				'279.78',
				'323.08',
				'366.38',
			],
		},
		{
			img: sym('symbol_H2.webp'),
			name: 'Copper Rocket',
			pays: [
				'1.33',
				'3.08',
				'4.82',
				'6.57',
				'8.32',
				'15.40',
				'22.48',
				'29.56',
				'36.63',
				'64.71',
				'92.78',
				'120.86',
				'148.93',
				'177.00',
				'205.08',
				'233.15',
			],
		},
		{
			img: sym('symbol_H3.webp'),
			name: 'Star Astrolabe',
			pays: [
				'0.83',
				'1.95',
				'3.08',
				'4.20',
				'5.32',
				'9.82',
				'14.32',
				'18.81',
				'23.31',
				'41.39',
				'59.47',
				'77.56',
				'95.64',
				'113.72',
				'131.80',
				'149.88',
			],
		},
		{
			img: sym('symbol_H4.webp'),
			name: 'Cadet Whiskers',
			pays: [
				'0.58',
				'1.35',
				'2.12',
				'2.89',
				'3.66',
				'6.70',
				'9.74',
				'12.78',
				'15.82',
				'30.21',
				'44.60',
				'59.00',
				'73.39',
				'87.79',
				'102.18',
				'116.57',
			],
		},
		{
			img: sym('symbol_L4.webp'),
			name: 'Red Quasar',
			pays: [
				'0.33',
				'0.77',
				'1.20',
				'1.64',
				'2.08',
				'3.85',
				'5.62',
				'7.39',
				'9.15',
				'18.55',
				'27.95',
				'37.35',
				'46.75',
				'56.14',
				'65.54',
				'74.94',
			],
		},
		{
			img: sym('symbol_L3.webp'),
			name: 'Solar Rhomb',
			pays: [
				'0.26',
				'0.59',
				'0.92',
				'1.25',
				'1.58',
				'2.93',
				'4.28',
				'5.64',
				'6.99',
				'14.56',
				'22.12',
				'29.69',
				'37.25',
				'44.82',
				'52.38',
				'59.95',
			],
		},
		{
			img: sym('symbol_L2.webp'),
			name: 'Ion Hex',
			pays: [
				'0.19',
				'0.46',
				'0.72',
				'0.98',
				'1.24',
				'2.26',
				'3.28',
				'4.30',
				'5.32',
				'11.22',
				'17.12',
				'23.03',
				'28.93',
				'34.83',
				'40.73',
				'46.63',
			],
		},
		{
			img: sym('symbol_L1.webp'),
			name: 'Void Diamond',
			pays: [
				'0.16',
				'0.37',
				'0.58',
				'0.79',
				'0.99',
				'1.83',
				'2.66',
				'3.49',
				'4.33',
				'8.94',
				'13.56',
				'18.17',
				'22.79',
				'27.40',
				'32.02',
				'36.63',
			],
		},
	];
</script>

{#if stateModal.modal?.name === 'payTable'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<div class="pt-frame" style="background-image: url({panelBg});">
			<div class="pt-scroll">
				<h1 class="pt-title">WIN TABLE</h1>
				<p class="pt-tag">
					All wins are multiplied by your play amount. Every valid cluster size is listed below.
				</p>

				<!-- All 16 payouts are split into four vertical blocks. This preserves the
					     reviewer-required labelled columns and x suffixes while keeping one-axis
					     scrolling at the smallest supported layout. -->
				{#each CLUSTER_GROUPS as group, groupIndex (group[0])}
					<section class="pt-pay-group">
						<div class="pt-grid pt-head">
							<span class="pt-corner">CLUSTER SIZE</span>
							{#each group as size (size)}
								<span class="pt-col-head">{size}</span>
							{/each}
						</div>
						{#each SYMBOLS as s (s.name)}
							<div class="pt-grid pt-row">
								<div class="pt-sym">
									<img src={s.img} alt={s.name} />
									<span class="pt-name">{s.name}</span>
								</div>
								{#each s.pays.slice(groupIndex * 4, groupIndex * 4 + 4) as pay, payIndex (`${s.name}-${groupIndex}-${payIndex}`)}
									<span class="pt-val">{pay}&times;</span>
								{/each}
							</div>
						{/each}
					</section>
				{/each}

				<div class="pt-special">
					<img src={sym('symbol_W.webp')} alt="Wormhole" />
					<div class="pt-special-info">
						<h2>Wormhole &mdash; Wild</h2>
						<p>Substitutes for all winning symbols to complete clusters.</p>
					</div>
				</div>
				<div class="pt-special">
					<img src={sym('symbol_S.webp')} alt="Supernova" />
					<div class="pt-special-info">
						<h2>Supernova &mdash; Scatter</h2>
						<p>
							4+ Supernovas on one spin trigger 12 Beyond the Horizon free spins. During free spins,
							3+ Supernovas add +4 more spins &mdash; retriggers can happen repeatedly.
						</p>
					</div>
				</div>
				<div class="pt-card">
					<h2>Gravity Multiplier</h2>
					<p>
						Every winning cascade feeds the black hole and climbs the ladder: &times;1 &rarr;
						&times;2 &rarr; &times;3 &rarr; &times;5 &rarr; &times;8 &rarr; &times;12 &rarr;
						&times;20 &rarr; &times;30 &rarr; &times;40 &rarr; &times;50 &rarr; &times;75 &rarr;
						&times;100. The multiplier applies to that cascade's wins and resets on the next base
						spin &mdash; but past the Event Horizon it NEVER resets.
					</p>
				</div>
			</div>
		</div>
		{@render props.children()}
	</Popup>
{/if}

<style>
	.pt-frame {
		position: relative;
		z-index: 100; /* above Popup's click-to-close layer so clicks/scroll work */
		/* owner: NOT full-bleed on desktop — the panel is sized to hold the table
		   with a decent margin around it, rather than stretching the ornate border
		   art across the whole screen. Capped in px so it stops growing on very
		   wide monitors (the content column is only ~1020px anyway), and the vh
		   cap keeps it off the top and bottom edges. Phones override below. */
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
	/* owner: margins way in on phones so the table uses the panel's real area.
	   Top stays deeper than the sides — the frame's crown is taller than its rails. */
	@media (max-width: 520px) {
		.pt-frame {
			width: calc(100vw - 10px);
			height: calc(100vh - 10px);
		}
		.pt-scroll {
			inset: 9% 6% 6%;
		}
		.pt-title {
			margin-top: 10px;
		}
	}
	.pt-title {
		text-align: center;
		font-size: clamp(18px, 4.6vw, 26px);
		letter-spacing: 0.06em;
		margin: 22px 0 2px;
		color: #ffb45e;
		text-shadow:
			0 2px 0 #1b1420,
			0 0 18px rgba(196, 64, 143, 0.55);
	}
	.pt-tag {
		text-align: center;
		color: #d9b8e8;
		margin: 0 0 14px;
		font-size: 0.85em;
	}
	.pt-pay-group + .pt-pay-group {
		margin-top: 18px;
	}
	/* shared 5-column template: symbol cell + one labelled column per cluster size */
	.pt-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.9fr) repeat(4, minmax(0, 1fr));
		align-items: center;
		gap: 0 8px;
		padding: 4px 2px;
	}
	.pt-head {
		border-bottom: 1px solid rgba(255, 180, 94, 0.45);
		padding-bottom: 2px;
		margin-bottom: 4px;
	}
	.pt-corner {
		color: #d9b8e8;
		font-size: 0.72em;
		letter-spacing: 0.06em;
		align-self: end;
	}
	.pt-col-head {
		color: #ffb45e;
		font-weight: 800;
		font-size: 0.95em;
		text-align: right;
	}
	.pt-row {
		/* owner: no binding box around each symbol — the row sits directly on the
		   panel, separated by spacing alone. */
		margin-bottom: 6px;
	}
	.pt-sym {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.pt-sym img {
		width: 48px;
		height: 48px;
		object-fit: contain;
		flex: none;
		filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
	}
	.pt-name {
		color: #ffd9ad;
		font-weight: 700;
		font-size: 0.92em;
		line-height: 1.15;
	}
	.pt-val {
		color: #ecd9c4;
		font-size: 0.95em;
		letter-spacing: 0.02em;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	/* phones: tighter grid so the widest value ("387.89×") never clips against
	   the panel edge and long names ("Astrolabe") stay off the first column.
	   AFTER the base rules — same specificity, source order decides. */
	@media (max-width: 520px) {
		.pt-grid {
			gap: 0 4px;
		}
		.pt-sym {
			gap: 5px;
		}
		.pt-sym img {
			width: 34px;
			height: 34px;
		}
		.pt-name {
			font-size: 0.8em;
		}
		.pt-val {
			font-size: 0.85em;
		}
		.pt-col-head {
			font-size: 0.85em;
		}
	}
	.pt-card {
		padding: 0;
		margin: 14px 0 0;
	}
	.pt-card h2 {
		color: #ff9440;
		font-size: 1.05em;
		margin: 0 0 5px;
	}
	.pt-card p {
		line-height: 1.45;
		font-size: 0.92em;
		color: #f4ead9;
	}
	.pt-special {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 2px;
		margin: 14px 0 0;
	}
	.pt-special img {
		width: 62px;
		height: 62px;
		object-fit: contain;
		flex: none;
		filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
	}
	.pt-special-info h2 {
		color: #ff9440;
		font-size: 1.02em;
		margin: 0 0 4px;
	}
	.pt-special-info p {
		line-height: 1.4;
		font-size: 0.9em;
		color: #f4ead9;
		margin: 0;
	}
</style>
