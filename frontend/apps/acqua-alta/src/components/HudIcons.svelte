<!-- ICON SPRITE — the kit's traced SVGs inlined as <symbol>s and recoloured
     through currentColor. Inline rather than fetched (zero extra requests is a
     hard Stake constraint) and kept out of the layout with position/size rather
     than `hidden`, because a <use> into a display:none subtree is a known
     browser trap. `ic-table` and `ic-sliders` are additions in the kit's idiom:
     it ships no wins-table or settings glyph.
     Extracted from HudBar.svelte so replay mode (which mounts no HudBar) can
     still resolve ModalGameRules' <use href="#ic-…"> Controls icons. -->
<svg aria-hidden="true" focusable="false" class="icsprite">
	<symbol id="ic-hamburger" viewBox="0 0 24 24">
		<rect x="3.4" y="5.0" width="17.2" height="3.0" rx="1.5" fill="currentColor" />
		<rect x="3.4" y="10.5" width="17.2" height="3.0" rx="1.5" fill="currentColor" />
		<rect x="3.4" y="16.0" width="17.2" height="3.0" rx="1.5" fill="currentColor" />
	</symbol>
	<symbol id="ic-close" viewBox="0 0 24 24">
		<line
			x1="6.5"
			y1="6.5"
			x2="17.5"
			y2="17.5"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="2.4"
		/>
		<line
			x1="17.5"
			y1="6.5"
			x2="6.5"
			y2="17.5"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="2.4"
		/>
	</symbol>
	<!-- SPIN — stroke 1.9, not the traced 2.2: at 106% of the disc a 2.2 arrow
	     reads ~9.7% of the button against the reference's ~7%. -->
	<symbol id="ic-spin" viewBox="0 0 24 24">
		<path
			d="M18.96 14.46 a7.38 7.38 0 1 1 -1.74 -7.68 L21.0 10.36"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.9"
		/>
		<polyline
			points="21.0,5.44 21.0,10.36 16.1,10.36"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.9"
		/>
	</symbol>
	<symbol id="ic-autoplay" viewBox="0 0 24 24">
		<path
			d="M4.9 13.9 A7.4 7.4 0 0 1 16.9 5.9"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.8"
		/>
		<polyline
			points="17.5,2.7 17.5,6.3 13.9,6.3"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.8"
		/>
		<path
			d="M19.1 10.1 A7.4 7.4 0 0 1 7.1 18.1"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.8"
		/>
		<polyline
			points="6.5,21.3 6.5,17.7 10.1,17.7"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.8"
		/>
		<path d="M10.2 9.1 L15.3 12 L10.2 14.9 Z" fill="currentColor" />
	</symbol>
	<symbol id="ic-chev-up" viewBox="0 0 24 24">
		<polyline
			points="5.5,14.6 12,8.4 18.5,14.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2.3"
		/>
	</symbol>
	<symbol id="ic-chev-down" viewBox="0 0 24 24">
		<polyline
			points="5.5,9.4 12,15.6 18.5,9.4"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2.3"
		/>
	</symbol>
	<!-- plus / minus at stroke 2.6: they are the PORTRAIT steppers, drawn at 80%
	     of an ~11.5vw button, and the traced 2.4 read thin at that size. -->
	<symbol id="ic-plus" viewBox="0 0 24 24">
		<line
			x1="12"
			y1="5.4"
			x2="12"
			y2="18.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="2.6"
		/>
		<line
			x1="5.4"
			y1="12"
			x2="18.6"
			y2="12"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="2.6"
		/>
	</symbol>
	<symbol id="ic-minus" viewBox="0 0 24 24">
		<line
			x1="5.4"
			y1="12"
			x2="18.6"
			y2="12"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="2.6"
		/>
	</symbol>
	<symbol id="ic-sound" viewBox="0 0 24 24">
		<path d="M4 9.6 H7.1 L11.4 6.0 V18 L7.1 14.4 H4 Z" fill="currentColor" />
		<path
			d="M14.4 9.1 a3.9 3.9 0 0 1 0 5.8"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.7"
		/>
		<path
			d="M16.8 6.7 a7.2 7.2 0 0 1 0 10.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.7"
		/>
	</symbol>
	<symbol id="ic-sound-off" viewBox="0 0 24 24">
		<path d="M4 9.6 H7.1 L11.4 6.0 V18 L7.1 14.4 H4 Z" fill="currentColor" />
		<line
			x1="15"
			y1="9.2"
			x2="20.4"
			y2="14.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.9"
		/>
		<line
			x1="20.4"
			y1="9.2"
			x2="15"
			y2="14.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.9"
		/>
	</symbol>
	<symbol id="ic-turbo" viewBox="0 0 24 24">
		<path
			d="M13.2 2.6 L5.2 12.9 H10.2 L9.3 21.4 L18.6 9.9 H13.1 Z"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.7"
		/>
	</symbol>
	<symbol id="ic-turbo-off" viewBox="0 0 24 24">
		<path
			d="M13.2 2.6 L5.2 12.9 H10.2 L9.3 21.4 L18.6 9.9 H13.1 Z"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.7"
		/>
		<line
			x1="3.4"
			y1="3.4"
			x2="20.6"
			y2="20.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.9"
		/>
	</symbol>
	<symbol id="ic-info-ring" viewBox="0 0 24 24">
		<circle
			cx="12"
			cy="12"
			r="8.4"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.6"
		/>
		<line
			x1="12"
			y1="11"
			x2="12"
			y2="16.4"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.9"
		/>
		<circle cx="12" cy="7.6" r="1.05" fill="currentColor" />
	</symbol>
	<symbol id="ic-table" viewBox="0 0 24 24">
		<rect
			x="3.6"
			y="4.8"
			width="16.8"
			height="14.4"
			rx="2.4"
			stroke="currentColor"
			fill="none"
			stroke-width="1.7"
		/>
		<line
			x1="3.6"
			y1="9.6"
			x2="20.4"
			y2="9.6"
			stroke="currentColor"
			fill="none"
			stroke-width="1.7"
		/>
		<line
			x1="3.6"
			y1="14.4"
			x2="20.4"
			y2="14.4"
			stroke="currentColor"
			fill="none"
			stroke-width="1.7"
		/>
		<line x1="12" y1="9.6" x2="12" y2="19.2" stroke="currentColor" fill="none" stroke-width="1.7" />
	</symbol>
	<symbol id="ic-sliders" viewBox="0 0 24 24">
		<line
			x1="4"
			y1="8.4"
			x2="20"
			y2="8.4"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.8"
		/>
		<line
			x1="4"
			y1="15.6"
			x2="20"
			y2="15.6"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-width="1.8"
		/>
		<circle cx="9.2" cy="8.4" r="2.6" fill="currentColor" />
		<circle cx="15.4" cy="15.6" r="2.6" fill="currentColor" />
	</symbol>
	<!-- GET BONUS coin — the one element the kit allows a game to make its own.
	     Flat disc, near-black rim, diagonal wordmark; all three fills and the face
	     come from theme tokens. CSS custom properties are used via `style=`, NOT
	     presentation attributes: fill="var(--x)" is not a legal attribute value and
	     silently paints black. A <use> clones these inline styles and resolves the
	     var() against the <use> element's inherited properties. -->
	<symbol id="ic-coin" viewBox="0 0 100 100">
		<circle cx="50" cy="50" r="47" style="fill:var(--gold-coin-rim)" />
		<circle cx="50" cy="50" r="43.5" style="fill:var(--gold-coin)" />
		<text
			x="50"
			y="56.5"
			text-anchor="middle"
			transform="rotate(-28 50 50)"
			font-size="21"
			font-weight="800"
			letter-spacing="0.4"
			style="fill:var(--gold-coin-ink); font-family:var(--font-display)">BONUS</text
		>
	</symbol>
</svg>

<style>
	.icsprite {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}
</style>
