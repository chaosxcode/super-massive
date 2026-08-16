<script lang="ts">
	// SUPERMASSIVE persistent control bar — the hacksaw-ui-kit HUD_BAR_BLUEPRINT
	// recipe (hud/hud.html + hud/hud.css), ported to Svelte and re-themed to the
	// game's deep-space brass palette. It is DOM over the pixi canvas, which is
	// the kit's own architecture (UI-BIBLE §4).
	//
	// ONE DOM, TWO LAYOUTS. Source order IS the landscape order —
	//   [coin] [☰] [BALANCE] [WIN | TOTAL PLAY] ·spacer· [PLAY AMOUNT ▲▼] [SPIN] [auto]
	// — and portrait re-places the SAME elements with explicit grid areas rather
	// than carrying a second markup. Two structures for one set of IDs is how a
	// control quietly stops being wired.
	//
	// DIVERGENCES FROM THE KIT, all deliberate:
	//  · `body.landscape` is a class on #controls instead, driven by the game's own
	//    `stateLayoutDerived.isStacked()` — literally the same call the canvas
	//    layout solver makes, which is what the blueprint's "a CLASS, never a media
	//    query" rule is actually protecting. Chrome and canvas cannot disagree.
	//  · the size tokens live in ../game/hudLayout.ts, not in CSS clamp()s, because
	//    stateLayout.ts has to reserve the same band the bar draws.
	//  · ids are `btn-bonus` / `btn-amt-up` / `btn-amt-down`, not the kit's
	//    `btn-buy` / `btn-bet-*` — a restricted-word sweep reads the bundle.
	//  · the autoplay button shows the REMAINING COUNT while running instead of the
	//    kit's ✕; dropping that number would be an information regression.
	//  · SPIN shows STOP text mid-round (the review-approved behaviour) rather than
	//    the kit's rotating reload glyph.
	import { onMount } from 'svelte';

	import { EnableSpaceHold } from 'components-shared';
	import {
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateSound,
		stateUi,
	} from 'state-shared';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { FRAME_SIZES } from '../game/constants';
	import { hudTokens } from '../game/hudLayout';
	import HudIcons from './HudIcons.svelte';

	const context = getContext();
	const L = context.stateLayoutDerived;

	// ---- geometry (the same tokens stateLayout.ts reserves the band from) ------
	const stacked = $derived(L.isStacked());
	const T = $derived(
		hudTokens({ width: L.canvasSizes().width, height: L.canvasSizes().height, stacked }),
	);
	// The landscape cluster centres on the BOARD and sizes itself to the board's
	// frame, so it needs the frame's solved rect in px (kit host contract #2).
	const frameW = $derived(FRAME_SIZES.width * L.mainLayout().scale);
	const frameX = $derived(L.mainLayout().x - frameW / 2);
	// Capped so the coin hanging off the cluster's left edge can never be pushed
	// off-screen, however wide the board's frame comes out.
	const seatMax = $derived(
		Math.max(120, L.canvasSizes().width - (T.coinD + T.coinGap + T.edgePad) * 2),
	);
	const seatMin = $derived(Math.min(frameW * 0.97, seatMax));

	const vars = $derived(
		[
			`--bar-h:${T.barH}px`,
			`--spin-d:${T.spinD}px`,
			`--coin-d:${T.coinD}px`,
			`--step-d:${T.stepD}px`,
			`--ham-d:${T.hamD}px`,
			`--auto-d:${T.autoD}px`,
			`--chev-w:${T.chevW}px`,
			`--chip-h:${T.chipH}px`,
			`--amt-min:${T.amtMin}px`,
			`--bar-pad:${T.barPad}px`,
			`--bar-gap:${T.barGap}px`,
			`--coin-gap:${T.coinGap}px`,
			`--seat-pad-x:${T.seatPadX}px`,
			`--step-pad-r:${T.stepPadR}px`,
			`--spacer-min:${T.spacerMin}px`,
			`--fs-bar-k:${T.fsK}px`,
			`--fs-bar-v:${T.fsV}px`,
			`--row-gap:${T.rowGap}px`,
			`--pad-t:${T.padTop}px`,
			`--ro-h:${T.roH}px`,
			`--spin-over:${T.spinOver}px`,
			`--safe-b:${T.safeB}px`,
			`--frame-x:${frameX}px`,
			`--frame-w:${frameW}px`,
			`--seat-min:${seatMin}px`,
			`--seat-max:${seatMax}px`,
		].join(';'),
	);

	// ---- readouts -------------------------------------------------------------
	const balance = $derived(numberToCurrencyString(stateBet.balanceAmount));
	// winBookEventAmount is a BOOK amount (100 == 1.00 at the wagered play), not a
	// currency amount — the old bar printed it raw and showed "700.00" for a 70.00
	// win (visible in the Stake revision PDF's own screenshot).
	const win = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));
	const hasWin = $derived(stateBet.winBookEventAmount > 0);
	// The PLAY AMOUNT chip carries the level the player picks and steps; the third
	// readout carries TOTAL PLAY whenever an ante mode makes a round cost more.
	const playAmount = $derived(numberToCurrencyString(stateBet.betAmount));
	const totalPlay = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const showTotalPlay = $derived(stateBetDerived.betCost() !== stateBet.betAmount);
	// Compliance: the active mode's own label, else the compliant PLAY fallback.
	// NEVER i18nDerived.bet() — components-ui-html's copy of it returns "BET"
	// outside social mode and it wins the spread in ../i18n/i18nDerived.
	const amountLabel = $derived(
		stateBetDerived.activeBetMode()?.text?.betAmountLabel || 'PLAY AMOUNT',
	);

	// activeBetModeKey's casing is not stable (it defaults to 'BASE' and is written
	// from several places), so never compare it raw — same trap that stopped the
	// Ejecta Reactor firing.
	const modeKey = $derived((stateBet.activeBetModeKey ?? '').toLowerCase());
	const isPersistentMode = () => ['ante', 'wildshot'].includes(modeKey);
	// Anything other than plain base play is "armed": the player is paying more per
	// round and the bar has to say so, by name and by amount.
	const armed = $derived(modeKey !== '' && modeKey !== 'base');
	const armedName = $derived(stateBetDerived.activeBetMode()?.text?.title ?? '');

	const idle = $derived(context.stateXstateDerived.isIdle());
	const insufficient = $derived(!stateBetDerived.isBetCostAvailable());
	const autoCount = $derived(stateBet.autoSpinsCounter);
	const autoOn = $derived(autoCount !== 0);
	const bonusActive = $derived(stateBetDerived.activeBetMode()?.type === 'activate');
	const spinIsStop = $derived(!idle);
	const soundOn = $derived(stateSound.volumeValueMaster !== 0);
	const menuOpen = $derived(stateUi.menuOpen);

	// ---- jurisdiction gating (flags populated async by Authenticate.svelte, so
	//      they MUST be read reactively — a snapshot at mount misses them) -------
	// TODO: jurisdiction.minimumRoundDuration is stored but unenforced
	const jurisdiction = $derived(stateConfig.jurisdiction);
	const slamstopDisabled = $derived(jurisdiction.disabledSlamstop);

	let uiShown = $state(true);
	context.eventEmitter.subscribeOnMount({
		uiHide: () => (uiShown = false),
		uiShow: () => (uiShown = true),
	});

	// ---- actions (bodies lifted 1:1 from the pixi button components) -----------
	const sfx = () => context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

	const spinPress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		if (context.stateXstateDerived.isIdle()) {
			// insufficient balance keeps the button clickable and surfaces the
			// message instead of silently doing nothing (Stake approval req.)
			if (!stateBetDerived.isBetCostAvailable()) {
				stateModal.modal = { name: 'betMessage', message: 'insufficientFunds' };
				return;
			}
			// owner: DARK MATTER and THREE-WILD SHOT STAY ARMED for the next round —
			// they are cheap per-round modifiers (1.25x / 1.70x), not one-shot features.
			// Only the big features drop back to base once they have played.
			if (stateBetDerived.activeBetMode()?.type === 'buy' && !isPersistentMode())
				stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
		} else {
			// disabledSlamstop: mid-round the disc is inert — no early stop. (Guard
			// covers the spacebar path too; autoplay is still stopped from #btn-auto.)
			if (slamstopDisabled) return;
			if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	const betStep = (dir: 1 | -1) => {
		sfx();
		if (!context.stateXstateDerived.isIdle()) return;
		const options = [...stateConfig.betAmountOptions].sort((a, b) => a - b);
		const next =
			dir === 1
				? options.find((o) => o > stateBet.betAmount)
				: [...options].reverse().find((o) => o < stateBet.betAmount);
		if (next !== undefined) stateBet.betAmount = next;
	};

	const openBetMenu = () => {
		if (!context.stateXstateDerived.isIdle()) return;
		sfx();
		stateModal.modal = { name: 'betAmountMenu' };
	};

	const menuPress = () => {
		sfx();
		stateUi.menuOpen = !stateUi.menuOpen;
	};
	const closeMenu = () => (stateUi.menuOpen = false);
	const menuRow = (modal: 'payTable' | 'gameRules' | 'settings') => {
		sfx();
		stateUi.menuOpen = false;
		stateModal.modal = { name: modal };
	};
	const soundToggle = () => {
		sfx();
		stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
	};

	const bonusPress = () => {
		sfx();
		// Now that DARK MATTER and THREE-WILD SHOT persist across rounds, the coin
		// has to be able to switch them OFF again — not just the old 'activate'
		// type. Armed -> disarm; otherwise open the bonus menu.
		if (armed) {
			stateBet.activeBetModeKey = 'BASE';
		} else {
			stateModal.modal = { name: 'buyBonus' };
		}
	};

	const autoPress = () => {
		if (stateBet.isSpaceHold) return;
		if (!context.stateXstateDerived.isIdle() && !stateBetDerived.hasAutoBetCounter()) return;
		if (!stateBetDerived.isBetCostAvailable()) return;
		sfx();
		if (stateBetDerived.hasAutoBetCounter()) {
			stateBet.autoSpinsCounter = 0;
		} else {
			// the platform's explicit confirm step — autoplay never starts on one tap
			stateModal.modal = { name: 'autoSpin' };
		}
	};

	const turboPress = () => {
		if (stateBet.isSpaceHold) return;
		sfx();
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
	};

	// ---- spacebar spin (same guards the pixi ButtonBet used: dead while any
	//      modal/menu is open, dead on insufficient balance) --------------------
	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code !== 'Space' || e.repeat) return;
			if (jurisdiction.disabledSpacebar) return;
			if (stateModal.modal !== null || stateUi.menuOpen) return;
			if (insufficient && context.stateXstateDerived.isIdle()) return;
			e.preventDefault();
			spinPress();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<!-- The first keydown is handled by spinPress below. After 400ms, the shared
     hold controller arms stateBet.isSpaceHold; the bet state machine reads it
     after settlement and starts the next round immediately. Destroying this
     controller on a menu/jurisdiction gate also releases a held state safely. -->
{#if !jurisdiction.disabledSpacebar && !menuOpen}
	<EnableSpaceHold />
{/if}

<!-- icon sprite defs (extracted so replay mode can mount them without the bar) -->
<HudIcons />

<!-- NO full-screen scrim on the popover — the board stays bright beside it
     (UI-BIBLE §1.3). This veil is transparent and exists only so a tap outside
     closes the menu, which is the reference's behaviour. -->
{#if menuOpen}
	<button class="menuveil" aria-label="Close menu" onclick={closeMenu}></button>
{/if}

<!-- THE RESERVED BAND. `#controls` is what ../game/stateLayout.ts measures to
     decide where the board ends. It is deliberately TALLER than the dark seat,
     because the SPIN disc overflows the seat upward and the board must clear the
     DISC, not the seat it pokes out of. -->
<section
	id="controls"
	class:landscape={!stacked}
	class:popout={T.popout}
	class:menu-open={menuOpen}
	class:hidden={!uiShown}
	aria-hidden={!uiShown}
	style={vars}
>
	<div id="bar">
		{#if !jurisdiction.disabledBuyFeature}
			<button
				id="btn-bonus"
				class="coinbtn"
				class:active={bonusActive}
				type="button"
				aria-label={armed ? `${armedName} active, ${totalPlay} per round` : 'Get bonus'}
				onclick={bonusPress}
			>
				<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#ic-coin" /></svg>
				{#if armed}
					<!-- Floats ABOVE the coin and is absolutely positioned, so it states the
					     armed mode without touching the solved bar layout or the seat-width
					     cap that keeps the coin on-screen. -->
					<span class="armed-chip">
						<b>ACTIVE</b>
						<i>{armedName}</i>
						<em>{totalPlay}</em>
					</span>
				{/if}
			</button>
		{/if}

		<button
			id="btn-menu"
			class="barbtn hambtn"
			type="button"
			aria-label="Menu"
			aria-expanded={menuOpen}
			onclick={menuPress}
		>
			<svg class="ic ic-bars" viewBox="0 0 24 24" aria-hidden="true"
				><use href="#ic-hamburger" /></svg
			>
			<svg class="ic ic-x" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-close" /></svg>
		</button>

		<!-- Readout 1 of 2 PERMANENT. No separate currency label: the money
		     formatter already emits the symbol or the suffixed coin code, and a
		     second label renders "1,000.00 SC SC" in social mode. -->
		<div class="ro" id="ro-balance">
			<span class="ro-k">{context.i18nDerived.balance()}</span>
			<span class="ro-v num">{balance}</span>
		</div>

		<!-- The THIRD readout slot, shared and mutually exclusive: WIN whenever the
		     meter is above zero, else TOTAL PLAY whenever the DARK MATTER ante has
		     made a round cost more than the play amount. Both hidden at rest, so
		     the idle bar reads as the two columns the reference shows. Its height
		     comes from the PERMANENT readouts, so flipping it can never change the
		     band the solver measured. -->
		{#if hasWin}
			<div class="ro win" id="ro-third">
				<span class="ro-k">{context.i18nDerived.win()}</span>
				<span class="ro-v num">{win}</span>
			</div>
		{:else if showTotalPlay}
			<div class="ro" id="ro-third">
				<span class="ro-k">TOTAL PLAY</span>
				<span class="ro-v num">{totalPlay}</span>
			</div>
		{/if}

		<div class="bar-spacer"></div>

		<!-- PLAY AMOUNT. Landscape: a boxed chip with a chevron stepper on its right
		     edge. Portrait: `display:contents` dissolves the chip so its parts BECOME
		     grid items of #bar — the value drops to the readout row and these same
		     two buttons become the big − / + flanking the SPIN. Same ids, same
		     handlers, one markup. -->
		<div class="playamt">
			<button class="amtbox" type="button" aria-label="Play amount" onclick={openBetMenu}>
				<span class="ro-k">{amountLabel}</span>
				<span class="ro-v num">{playAmount}</span>
			</button>
			<div class="stepper">
				<button
					id="btn-amt-up"
					class="barbtn"
					type="button"
					aria-label="Raise play amount"
					onclick={() => betStep(1)}
				>
					<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-chev-up" /></svg>
					<svg class="ic ic-big" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-plus" /></svg
					>
				</button>
				<button
					id="btn-amt-down"
					class="barbtn"
					type="button"
					aria-label="Lower play amount"
					onclick={() => betStep(-1)}
				>
					<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-chev-down" /></svg>
					<svg class="ic ic-big" viewBox="0 0 24 24" aria-hidden="true"
						><use href="#ic-minus" /></svg
					>
				</button>
			</div>
		</div>

		<!-- TURBO flanks the spin opposite AUTO in BOTH layouts (owner). It sits
		     immediately before the spin in the markup so the landscape flex row
		     orders itself; portrait places it explicitly on the grid. The menu row
		     and this button share turboPress, so their state can never diverge. -->
		{#if !jurisdiction.disabledTurbo}
			<button
				id="btn-turbo-bar"
				class="barbtn turbobtn"
				class:off={!stateBet.isTurbo}
				type="button"
				aria-label="Turbo"
				aria-pressed={stateBet.isTurbo}
				onclick={turboPress}
			>
				<svg class="ic ic-on" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-turbo" /></svg>
				<svg class="ic ic-off" viewBox="0 0 24 24" aria-hidden="true"
					><use href="#ic-turbo-off" /></svg
				>
			</button>
		{/if}

		<!-- disabledSlamstop: mid-round the disc is disabled instead of acting as
		     STOP — no early-stop affordance at all (autoplay-stop is #btn-auto's). -->
		<button
			id="btn-spin"
			class="barbtn spin"
			class:insufficient
			type="button"
			disabled={spinIsStop && slamstopDisabled}
			aria-label={spinIsStop ? (slamstopDisabled ? 'Round playing' : 'Stop') : 'Play'}
			onclick={spinPress}
		>
			{#if spinIsStop && !slamstopDisabled}
				<span class="stoptxt">{context.i18nDerived.stop()}</span>
			{:else}
				<svg class="ic ic-spin" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-spin" /></svg>
			{/if}
		</button>

		{#if !jurisdiction.disabledAutoplay}
			<button
				id="btn-auto"
				class="barbtn autobtn"
				class:on={autoOn}
				type="button"
				aria-label={autoOn ? 'Stop auto play' : 'Auto play'}
				onclick={autoPress}
			>
				{#if autoOn}
					<span class="autocount num">{autoCount === Infinity ? '∞' : autoCount}</span>
				{:else}
					<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-autoplay" /></svg>
				{/if}
			</button>
		{/if}

		<!-- The bottom-left menu popover. Anchored to the bar's left edge, which is
		     where the hamburger is in BOTH layouts, and it rises out of it. Home of
		     every control the thin bar has no slot for — Turbo lives here now.
		     Toggle state is the SLASH on the glyph, never a dimmed label. -->
		{#if menuOpen}
			<nav id="menu-pop" aria-label="Game menu">
				<button
					class="pop-row"
					class:off={!soundOn}
					type="button"
					aria-pressed={soundOn}
					onclick={soundToggle}
				>
					<span class="circ">
						<svg class="ic ic-on" viewBox="0 0 24 24" aria-hidden="true"
							><use href="#ic-sound" /></svg
						>
						<svg class="ic ic-off" viewBox="0 0 24 24" aria-hidden="true"
							><use href="#ic-sound-off" /></svg
						>
					</span>
					Sound
				</button>
				{#if !jurisdiction.disabledTurbo}
					<button
						class="pop-row"
						class:off={!stateBet.isTurbo}
						type="button"
						aria-pressed={stateBet.isTurbo}
						onclick={turboPress}
					>
						<span class="circ">
							<svg class="ic ic-on" viewBox="0 0 24 24" aria-hidden="true"
								><use href="#ic-turbo" /></svg
							>
							<svg class="ic ic-off" viewBox="0 0 24 24" aria-hidden="true"
								><use href="#ic-turbo-off" /></svg
							>
						</span>
						Turbo
					</button>
				{/if}
				<button class="pop-row" type="button" onclick={() => menuRow('payTable')}>
					<span class="circ">
						<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-table" /></svg>
					</span>
					Wins Table
				</button>
				<button class="pop-row" type="button" onclick={() => menuRow('gameRules')}>
					<span class="circ">
						<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-info-ring" /></svg
						>
					</span>
					Game Rules
				</button>
				<button class="pop-row" type="button" onclick={() => menuRow('settings')}>
					<span class="circ">
						<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-sliders" /></svg>
					</span>
					Settings
				</button>
			</nav>
		{/if}
	</div>
</section>

<style>
	/* ======================================================================
	   THEME — SUPERMASSIVE. The only block in this component that names a
	   colour: deep-space violet surfaces, brass-and-gold rims, orange accent.
	   Everything else is portable chrome from hacksaw-ui-kit/hud/hud.css.
	   Kept on #controls (not :root) so the HUD leaks nothing into the app.
	   ====================================================================== */
	#controls {
		--seat: rgba(12, 6, 24, 0.84);
		--seat-rim: rgba(238, 189, 82, 0.2);
		--chip-face: #241432;
		--chip-rim: rgba(238, 189, 82, 0.22);
		--spin-face: radial-gradient(130% 130% at 50% 28%, #2f1c56 0%, #180e33 58%, #0e0721 100%);
		--panel: #100a20;
		--glass-w: rgba(255, 255, 255, 0.14);
		--glass-w-rim: rgba(238, 189, 82, 0.34);
		--glass-w-soft: rgba(238, 189, 82, 0.08);
		--glass-w-press: rgba(238, 189, 82, 0.16);
		--hairline-strong: rgba(238, 189, 82, 0.36);
		--text: #f6ead2;
		--bar-dim: #b1a0cd;
		--accent-win: #eebd52;
		--accent-on: #ff9440;
		--gold-coin: #eebd52;
		--gold-coin-rim: #3d2107;
		--gold-coin-ink: #221204;
		--font-display: proxima-nova, sans-serif;
		--r-seat: 16px;
		--r-box: 12px;
		--r-panel: 14px;
		--r-btn: 8px;
		--ls-caps: 0.06em;
		--press-scale: 0.9;
		--dur-press: 90ms;
		--dur-ui: 170ms;
		--ease-ui: cubic-bezier(0.22, 1, 0.36, 1);
		--ring: 0 0 0 3px rgba(255, 148, 64, 0.55);
	}

	/* ---- shared plumbing -------------------------------------------------- */
	/* THE BUTTON COLOUR ROOT.
	   This reset is `#controls :global(button)` — specificity (1,0,1) — so it beats
	   every plain `.turbobtn` / `.hambtn` / `.spin` class rule (0,1,0). Those rules
	   were silently losing and the buttons fell back to `inherit`, which resolved to
	   the document default: BLACK. Measured `rgb(0,0,0)` on the turbo glyph.
	   Setting white HERE fixes every icon at once, since the glyphs all paint with
	   fill/stroke="currentColor". Readouts that want the cream token still set
	   `color: var(--text)` on themselves and are unaffected. */
	#controls :global(button) {
		appearance: none;
		border: none;
		background: none;
		padding: 0;
		margin: 0;
		font: inherit;
		color: #fff;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	#controls :global(button:focus-visible) {
		outline: none;
		box-shadow: var(--ring);
	}

	/* Every glyph is a <use> into the sprite, filled through currentColor. */
	.ic {
		display: block;
		width: 100%;
		height: 100%;
		color: inherit;
	}
	.barbtn {
		display: grid;
		place-items: center;
		color: var(--text);
		flex: 0 0 auto;
		transition:
			transform var(--dur-press) var(--ease-ui),
			background var(--dur-ui) var(--ease-ui),
			opacity var(--dur-ui) var(--ease-ui);
	}
	.barbtn:active {
		transform: scale(var(--press-scale));
	}

	/* ======================================================================
	   THE RESERVED BAND — what ../game/stateLayout.ts measures. Deliberately
	   taller than the seat; the SPIN disc overflows the seat upward.
	   Portrait height is content-derived from FIXED rows, so a measurement can
	   never disagree with what is drawn.
	   ====================================================================== */
	#controls {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9; /* over canvas (0), embers (5), mascot (6); under the modals */
		padding: var(--pad-t) var(--bar-pad) calc(var(--bar-pad) + var(--safe-b));
		background: none; /* PORTRAIT: no band at all */
		overflow: visible;
		box-sizing: border-box;
		pointer-events: none; /* the band is not a wall; only its controls take taps */
		font-family: proxima-nova, sans-serif;
		transition: opacity 220ms linear;
	}
	#controls.landscape {
		/* FIXED: seat + the spin's overflow above and below it + 8px of air. */
		height: calc(var(--bar-h) + var(--spin-over) * 2 + 8px + var(--safe-b));
		padding: 0;
	}
	#controls.hidden {
		opacity: 0;
		pointer-events: none;
	}
	#controls.hidden :global(*) {
		pointer-events: none;
	}

	/* ======================================================================
	   THE BAR — portrait grid / landscape cluster.

	   PORTRAIT: six equal columns. That is what puts the SPIN dead-centre of
	   the SCREEN (1/-1 + justify-self:center) with PLAY AMOUNT exactly under
	   it (cols 3-4), BALANCE at 1/6 and the third readout at 5/6.

	   ⚠️ TRAP 1 — the dark seat is a FIXED height, never min-height. A tall
	   child (the SPIN) stretches a min-height seat and it will never look thin
	   however small the token. On a wide stage the visible dark block is NOT a
	   full-width band — it is THIS cluster, so the cluster carries the fixed
	   height. Fixing only an outer band leaves desktop thick.
	   ====================================================================== */
	#bar {
		position: relative;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		grid-template-rows: var(--spin-d) var(--ro-h);
		row-gap: var(--row-gap);
		align-items: center;
		overflow: visible;
		pointer-events: none;
	}
	#controls.landscape #bar {
		position: absolute;
		bottom: calc(var(--safe-b) + var(--spin-over) + 4px);
		left: calc(var(--frame-x) + var(--frame-w) / 2);
		transform: translateX(-50%);
		height: var(--bar-h); /* FIXED HEIGHT — the whole point */
		display: flex;
		align-items: center;
		gap: var(--bar-gap);
		width: max-content;
		min-width: var(--seat-min);
		max-width: var(--seat-max);
		padding: 0 var(--seat-pad-x);
		background: var(--seat);
		border: 1px solid var(--seat-rim);
		border-radius: var(--r-seat);
		box-shadow: 0 10px 34px rgba(0, 0, 0, 0.55);
		box-sizing: border-box;
		pointer-events: auto;
	}
	#bar :global(button),
	#bar .ro {
		pointer-events: auto;
	}

	/* The flex spacer that opens the middle of the landscape cluster. In
	   portrait the bar is a grid and an extra item would claim a cell. */
	.bar-spacer {
		display: none;
	}
	#controls.landscape .bar-spacer {
		display: block;
		flex: 1 1 auto;
		min-width: var(--spacer-min);
	}

	/* Stepper glyph swap: chevrons inside the landscape chip, big − / + flanking
	   the portrait spin. Same two buttons, same two ids, same handlers. */
	.stepper .ic {
		display: none;
	}
	.stepper .ic-big {
		display: block;
	}
	#controls.landscape .stepper .ic {
		display: block;
	}
	#controls.landscape .stepper .ic-big {
		display: none;
	}

	/* ---- GET BONUS coin --------------------------------------------------- */
	/* Hangs OUTSIDE the cluster on the left in landscape. `right:100%` is
	   measured off the SEAT, so it can never overlap the seat and never needs to
	   know how wide the seat came out. Portrait parks it top-left. */
	.coinbtn {
		position: relative;
		width: var(--coin-d);
		height: var(--coin-d);
		border-radius: 50%;
		grid-area: 1 / 6 / 2 / 7;
		justify-self: end;
		/* owner: sits on the same baseline as the hamburger opposite it */
		align-self: end;
		z-index: 6;
		filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.55));
		transition: transform var(--dur-press) var(--ease-ui);
	}
	.coinbtn svg {
		display: block;
		width: 100%;
		height: 100%;
	}
	.coinbtn.active {
		--gold-coin: #b98cff;
		--gold-coin-rim: #2a1250;
	}
	.coinbtn:active {
		transform: scale(var(--press-scale));
	}
	.armed-chip {
		position: absolute;
		bottom: calc(100% + 6px);
		/* right-anchored: the coin sits at the screen's right edge in portrait, so a
		   centred pill would hang off-screen. Landscape re-centres it below. */
		right: 0;
		transform: none;
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 3px 9px;
		border-radius: 999px;
		background: #100a20;
		border: 1px solid #ffcf43;
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.6);
		white-space: nowrap;
		pointer-events: none;
		font-size: clamp(8px, 2.1vw, 11px);
		line-height: 1;
		letter-spacing: 0.06em;
		color: #fff;
	}
	.armed-chip b {
		color: #ffcf43;
		font-weight: 800;
	}
	.armed-chip i {
		font-style: normal;
		font-weight: 700;
	}
	.armed-chip em {
		font-style: normal;
		font-weight: 800;
		color: #ffe7a0;
	}
	#controls.popout .armed-chip {
		font-size: 7px;
		padding: 2px 5px;
		gap: 3px;
	}
	#controls.landscape .armed-chip {
		right: auto;
		left: 50%;
		transform: translateX(-50%);
	}
	#controls.landscape .coinbtn {
		position: absolute;
		right: 100%;
		margin-right: var(--coin-gap);
		top: 50%;
		transform: translateY(-50%);
	}
	#controls.landscape .coinbtn:active {
		transform: translateY(-50%) scale(var(--press-scale));
	}

	/* ---- hamburger -------------------------------------------------------- */
	/* ⚠️ TRAP 2 — NEVER size these controls with `padding: N%`. A percentage
	   padding resolves against the CONTAINING BLOCK's width, not the button's
	   own; on a flex cluster that rendered a 92px spin disc at 215px and
	   squeezed the balance readout to a width of exactly 0. Every glyph below is
	   sized as a percentage of ITS OWN BUTTON, which is what a child's `width:
	   N%` actually means. */
	.hambtn {
		width: var(--ham-d);
		height: var(--ham-d);
		border-radius: 50%;
		grid-area: 1 / 1 / 2 / 2;
		justify-self: start;
		align-self: end;
		background: var(--glass-w);
		/* owner: white, not the inherited bar tint. The glyphs are drawn with
		   fill/stroke="currentColor", so this is what actually colours them. */
		color: #fff;
	}
	.hambtn .ic {
		width: 54%;
		height: 54%;
		color: #fff;
	}
	#controls.landscape .hambtn {
		background: none;
		border-radius: var(--r-btn);
		align-self: center;
	}
	#controls.landscape .hambtn .ic {
		width: 100%;
		height: 100%;
	}
	.hambtn .ic-x {
		display: none;
	}
	#controls.menu-open .hambtn .ic-bars {
		display: none;
	}
	#controls.menu-open .hambtn .ic-x {
		display: block;
	}

	/* ---- readouts --------------------------------------------------------- */
	.ro,
	.amtbox {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1.06;
		min-width: 0;
		/* No band in portrait, so the type carries its own contrast. */
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.85);
	}
	.ro-k {
		font-size: var(--fs-bar-k);
		letter-spacing: var(--ls-caps);
		text-transform: uppercase;
		font-weight: 600;
		color: var(--bar-dim);
		white-space: nowrap;
	}
	.ro-v {
		font-size: var(--fs-bar-v);
		font-weight: 800;
		color: var(--text);
		white-space: nowrap;
	}
	.ro.win .ro-v {
		color: var(--accent-win);
	}
	/* Numerals must never jitter as digits change. */
	.num {
		font-family: var(--font-display);
		font-variant-numeric: tabular-nums lining-nums;
		font-feature-settings:
			'tnum' 1,
			'lnum' 1;
	}
	#ro-balance {
		grid-area: 2 / 1 / 3 / 3;
	}
	#ro-third {
		/* CENTRE column: this is the WIN / TOTAL PLAY slot, and the owner wants a
		   win to read dead centre under the board. PLAY AMOUNT took its old
		   right-hand cells. */
		grid-area: 2 / 3 / 3 / 5;
	}
	#controls.landscape .ro {
		align-items: flex-start;
		text-shadow: none;
		/* Never let the balance be squeezed to zero when the cluster hits
		   max-width — the "BALA! CA…" truncation the reviewer screenshotted. */
		flex: 0 0 auto;
	}

	/* ---- PLAY AMOUNT chip + stepper --------------------------------------- */
	/* Landscape: the only boxed cluster besides the spin. Portrait:
	   `display:contents` dissolves the chip so its parts become grid items of
	   #bar — the value drops to the readout row and the two stepper buttons
	   become the big − / + that flank the spin. */
	.playamt,
	.stepper {
		display: contents;
	}
	.amtbox {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
	}
	#controls.landscape .playamt {
		display: flex;
		align-items: stretch;
		height: var(--chip-h);
		background: var(--chip-face);
		border: 1px solid var(--chip-rim);
		border-radius: var(--r-box);
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		flex: 0 0 auto;
		pointer-events: auto;
	}
	#controls.landscape .stepper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		padding-right: var(--step-pad-r);
	}
	#controls.landscape .amtbox {
		align-items: flex-start;
		/* The active-field underline lives in the bottom of the chip, so the
		   label+value block is centred in what is LEFT — otherwise the value
		   sits on the line. */
		padding: 0 var(--seat-pad-x) calc(var(--chip-h) * 0.18);
		min-width: var(--amt-min);
		text-shadow: none;
	}
	/* The active-field underline under the value. A HAIRLINE, not a 3px bar. */
	#controls.landscape .amtbox::after {
		content: '';
		position: absolute;
		left: var(--seat-pad-x);
		right: var(--seat-pad-x);
		bottom: 12%;
		height: max(2px, calc(var(--bar-h) * 0.042));
		border-radius: 2px;
		background: var(--accent-win);
	}

	/* PORTRAIT: the two stepper buttons are the big − and + either side of the
	   spin. The margin parks each one against the disc's edge. */
	#btn-amt-down,
	#btn-amt-up {
		width: var(--step-d);
		height: var(--step-d);
		border-radius: 26%;
		background: var(--glass-w);
		grid-row: 1;
	}
	.stepper .ic-big {
		width: 80%;
		height: 80%;
	}
	/* owner: the flanks belong to TURBO and AUTO now, so the steppers live inside
	   the PLAY AMOUNT chip in portrait too — the chevron treatment landscape has
	   always used. */
	.playamt {
		display: flex;
		align-items: stretch;
		grid-area: 2 / 5 / 3 / 7;
		height: var(--ro-h);
		/* owner: NO pill around PLAY AMOUNT in portrait — the value and its chevrons
		   sit bare on the bar like the other two readouts. Landscape keeps its chip
		   (see #controls.landscape .playamt), where the boxed cluster is the design. */
		background: none;
		border: 0;
		pointer-events: auto;
	}
	.stepper {
		display: flex;
		flex-direction: column;
	}
	#btn-amt-down,
	#btn-amt-up {
		width: var(--chev-w);
		height: 50%;
		border-radius: 0;
		margin: 0;
		grid-row: auto;
		/* glyphs are stroke="currentColor" */
		color: #fff;
	}
	.stepper .ic-big {
		width: 62%;
		height: 62%;
	}
	.turbobtn {
		width: var(--auto-d);
		height: var(--auto-d);
		border-radius: 50%;
		background: var(--glass-w);
		grid-row: 1;
		grid-column: 1 / 4;
		justify-self: end;
		align-self: center;
		margin-right: calc(var(--spin-d) / 2 + 8px);
	}
	.turbobtn {
		/* owner: white glyph in BOTH layouts. The icons are drawn with
		   fill/stroke="currentColor", so this is what actually colours them. */
		color: #fff;
	}
	/* THE MARGINS MUST BE STATED AT THIS SPECIFICITY.
	   `#controls :global(button) { margin: 0 }` is (1,0,1) and beats a plain
	   `.turbobtn` / `.autobtn` class rule (0,1,0), so the plain version was
	   silently dropped and both buttons collapsed onto the spin's edges — hidden
	   behind it, since the spin carries z-index 5. Measured: spin spanned
	   146-256, turbo 157-202, auto 201-246. */
	#controls .turbobtn {
		margin-right: calc(var(--spin-d) / 2 + 10px);
	}
	#controls .autobtn {
		margin-left: calc(var(--spin-d) / 2 + 10px);
	}
	.turbobtn .ic { width: 58%; height: 58%; }
	.turbobtn .ic-off { display: none; }
	.turbobtn.off .ic-on { display: none; }
	.turbobtn.off .ic-off { display: block; }
	#controls.landscape .turbobtn {
		grid-column: auto;
		margin-right: 0 !important;
		background: none;
		align-self: center;
		/* stated at this specificity so nothing in the landscape block can win it */
		color: #fff;
	}
	#controls.landscape .turbobtn .ic {
		color: #fff;
	}
	#controls.landscape #btn-amt-down,
	#controls.landscape #btn-amt-up {
		/* owner: white on desktop as well as portrait */
		color: #fff;
		width: var(--chev-w);
		height: calc(var(--chev-w) * 0.86);
		margin: 0;
		border-radius: 5px;
		background: none;
	}
	#controls.landscape .stepper .ic {
		width: 92%;
		height: 92%;
	}
	@media (hover: hover) {
		#controls.landscape #btn-amt-down:hover,
		#controls.landscape #btn-amt-up:hover {
			background: var(--glass-w-soft);
		}
		.amtbox:hover .ro-v {
			color: #fff;
		}
	}

	/* ---- SPIN disc -------------------------------------------------------- */
	/* The hero control. Landscape: a deep-violet face that OVERFLOWS the seat
	   upward. Portrait: a big disc horizontally centred on the SCREEN — spanning
	   the whole grid row is what centres it, and centring it is the point. */
	.spin {
		grid-area: 1 / 1 / 2 / 7;
		justify-self: center;
		width: var(--spin-d);
		height: var(--spin-d);
		border-radius: 50%;
		/* GLASS DISC (owner): the spin sits directly over the black hole, and a flat
		   filled circle disappeared into it. This reads as a lens instead —
		   a real backdrop blur, a lit top edge, shaded underside, and a deep cast
		   shadow that lifts it off the hole. */
		background:
			linear-gradient(
				158deg,
				rgba(255, 255, 255, 0.26) 0%,
				rgba(255, 255, 255, 0.08) 38%,
				rgba(255, 255, 255, 0.02) 58%,
				rgba(255, 255, 255, 0.1) 100%
			),
			var(--spin-face);
		backdrop-filter: blur(9px) saturate(1.25);
		-webkit-backdrop-filter: blur(9px) saturate(1.25);
		color: #fff;
		z-index: 5;
		box-shadow:
			/* separation from the hole */
			0 14px 34px rgba(0, 0, 0, 0.66),
			0 3px 8px rgba(0, 0, 0, 0.5),
			/* cool bloom so it reads as lit glass, not a hole */
			0 0 22px 1px rgba(122, 76, 255, 0.32),
			/* specular top edge + shaded underside = thickness */
			inset 0 1.5px 0 rgba(255, 255, 255, 0.62),
			inset 0 -10px 20px rgba(0, 0, 0, 0.38),
			inset 0 0 0 1.5px var(--glass-w-rim);
	}
	/* The reference draws the reload arrow at ~80% of the disc (measured 82/100
	   desktop, 251/320 portrait). 106% of the button lands it there. */
	.spin .ic-spin {
		width: 106%;
		height: 106%;
		/* owner: the reload arrow is WHITE. Stated explicitly on the glyph rather
		   than relying on .spin's colour, so no later/more-specific rule on the
		   button can tint it back. */
		color: #fff;
	}
	.spin.insufficient {
		filter: saturate(0.4) brightness(0.82);
	}
	.stoptxt {
		font-size: calc(var(--fs-bar-v) * 1.05);
		font-weight: 800;
		letter-spacing: 0.04em;
		/* owner: STOP stays WHITE even when the disc is in its unavailable state.
		   .spin.insufficient only desaturates/dims via filter, so the glyph colour
		   must be stated here or it inherits the dimmed bar text. */
		color: #fff;
	}
	.spin.insufficient .stoptxt,
	.spin:disabled .stoptxt {
		color: #fff;
	}

	/* ---- autoplay --------------------------------------------------------- */
	.autobtn {
		width: var(--auto-d);
		height: var(--auto-d);
		border-radius: 50%;
		grid-row: 1;
		grid-column: 4 / 7;
		justify-self: start;
		align-self: center;
		margin-left: calc(var(--spin-d) / 2 + 8px);
		background: var(--glass-w);
		/* owner: white in BOTH layouts — glyph and the running count alike */
		color: #fff;
	}
	.autobtn .ic,
	.autobtn .autocount {
		color: #fff;
	}
	/* Autoplay is 0.55x the spin with a SMALL glyph in a generous tap target. */
	.autobtn .ic {
		width: 62%;
		height: 62%;
	}
	#controls.landscape .autobtn {
		grid-column: auto;
		margin-left: 0 !important;
		background: none;
		align-self: center;
	}
	.autobtn.on {
		color: var(--accent-win);
	}
	.autocount {
		font-size: calc(var(--auto-d) * 0.42);
		font-weight: 800;
		line-height: 1;
	}

	/* ======================================================================
	   MENU POPOVER (UI-BIBLE §1.3)
	   Solid panel anchored bottom-left, rising out of the hamburger, rounded
	   corners, NO full-screen scrim — the board stays bright beside it. Home of
	   every control the thin bar has no slot for.
	   ====================================================================== */
	.menuveil {
		position: fixed;
		inset: 0;
		z-index: 8;
		background: transparent;
		border: none;
		padding: 0;
		cursor: default;
	}
	/* owner: the popout words kept coming out dark. Whatever is winning the
	   cascade on the label text nodes, this covers the panel and everything in
	   it — the on/off state is carried by the icon swap, never by colour. */
	#menu-pop,
	#menu-pop * {
		color: #fff;
	}
	#menu-pop {
		position: absolute;
		left: 0;
		/* owner: rises out of the HAMBURGER, not the top of the whole control band.
		   `bottom: 100%` cleared the spin disc too (it overflows above the seat),
		   which parked the menu far up the screen. Measured from the band's bottom:
		   safe area + bar padding + readout row + row gap puts us at the top of the
		   spin row, and one hamburger height lands on its top edge. z-index 20
		   keeps it over the spin. */
		bottom: calc(
			var(--safe-b) + var(--bar-pad) + var(--ro-h) + var(--row-gap) + var(--ham-d) + 6px
		);
		margin-bottom: 0;
		z-index: 20;
		width: clamp(206px, 62vw, 288px);
		max-height: 60vh;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 8px 0;
		border-radius: var(--r-panel);
		background: var(--panel);
		border: 1px solid var(--seat-rim);
		box-shadow: 0 -8px 34px rgba(0, 0, 0, 0.6);
		transform-origin: bottom left;
		animation: popIn var(--dur-ui) var(--ease-ui);
		pointer-events: auto;
	}
	#controls.landscape #menu-pop {
		left: clamp(6px, 0.8vw, 14px);
		bottom: calc(100% + 10px);
		width: clamp(206px, 20vw, 288px);
	}
	#controls.popout #menu-pop {
		width: 156px;
		padding: 4px 0;
	}
	@keyframes popIn {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
	}
	.pop-row {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: clamp(7px, 1.7vh, 14px) clamp(14px, 2vw, 22px);
		/* owner: menu popout text is WHITE, not the dimmed bar text token */
		color: #fff;
		font-size: clamp(12px, 3.2vw, 15px);
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		text-align: left;
		white-space: nowrap;
	}
	#controls.popout .pop-row {
		padding: 5px 10px;
		font-size: 10px;
		gap: 8px;
	}
	.pop-row .circ {
		width: clamp(28px, 8vw, 38px);
		height: clamp(28px, 8vw, 38px);
		min-width: clamp(28px, 8vw, 38px);
		/* owner: no gold ring around the popout icons — the glyph stands alone */
		display: grid;
		place-items: center;
		flex: 0 0 auto;
		color: #fff;
	}
	#controls.popout .pop-row .circ {
		width: 20px;
		height: 20px;
		min-width: 20px;
	}
	.pop-row .circ .ic {
		width: 56%;
		height: 56%;
	}
	@media (hover: hover) {
		.pop-row:hover {
			background: var(--glass-w-soft);
		}
	}
	.pop-row:active {
		background: var(--glass-w-press);
	}
	/* Toggle state is the SLASH on the glyph, never a dimmed label. */
	.pop-row .ic-off {
		display: none;
	}
	.pop-row.off .ic-on {
		display: none;
	}
	.pop-row.off .ic-off {
		display: block;
	}
	.pop-row.off {
		/* owner: words stay WHITE even when the row is toggled off — the on/off
		   icon swap already carries that state, dimming the label as well just
		   made half the menu look disabled. */
		color: #fff;
	}

	@media (prefers-reduced-motion: reduce) {
		#menu-pop {
			animation: none;
		}
		.barbtn,
		.coinbtn {
			transition: none;
		}
	}
</style>
