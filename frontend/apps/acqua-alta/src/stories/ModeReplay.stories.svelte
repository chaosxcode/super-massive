<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_ACQUA/replay',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';
	import { stateUrlDerived } from 'state-shared';

	import Game from '../components/Game.svelte';
	import ReplayAuthenticate from '../components/ReplayAuthenticate.svelte';
	import { setContext } from '../game/context';
	import ReplayStorySetup from './ReplayStorySetup.svelte';
	import books from './data/acqua_books';

	setContext();

	// ---------------------------------------------------------------------------
	// Story-only replay simulation (no shared package is modified):
	// 1. stateUrlDerived is a plain exported object of getter functions over the
	//    page URL ($app/state) — storybook's sveltekit mock pins page.url to
	//    https://example.com, so the getters are patched here to simulate
	//    ?replay=true&mode=...&amount=...&game=...&version=...&event=...&rgs_url=...
	//    This also makes the REAL shared no-network guards take the production
	//    replay path: utils-book recordBookEvent (skips POST /bet/event) and
	//    handleRequestEndRound (skips POST /wallet/end-round) both check
	//    stateUrlDerived.replay().
	// 2. window.fetch is stubbed for GET .../bet/replay/... so requestReplay()
	//    runs its real code path against a mocked RGS response
	//    ({ payoutMultiplier: float x, costMultiplier: float, state: [...] }).
	// NOTE: the patch persists for this iframe session — replay stories live in
	// their own file so the other story files are unaffected (fresh iframe each).
	// ---------------------------------------------------------------------------
	type ReplayUrl = { mode: string; amount: number; event: number };

	const simulateReplayUrl = ({ mode, amount, event }: ReplayUrl) => {
		stateUrlDerived.replay = () => true;
		stateUrlDerived.amount = () => amount;
		stateUrlDerived.mode = () => mode;
		stateUrlDerived.game = () => 'acqua-alta-storybook';
		stateUrlDerived.version = () => '1';
		stateUrlDerived.event = () => String(event);
		stateUrlDerived.rgsUrl = () => 'rgs.storybook.invalid';
	};

	const realFetch = window.fetch.bind(window);
	const stubReplayFetch = (respond: () => { status: number; body: unknown }) => {
		window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url =
				typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			if (url.includes('/bet/replay/')) {
				const { status, body } = respond();
				return new Response(JSON.stringify(body), {
					status,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return realFetch(input as RequestInfo, init);
		}) as typeof fetch;
	};

	// /bet/replay returns payoutMultiplier/costMultiplier as FLOATS in x —
	// the story books carry the book-file int cents (800 = 8.00x).
	const replayResponse = (
		book: { payoutMultiplier: number; events: unknown[] },
		costMultiplier: number,
	) => ({
		status: 200,
		body: {
			payoutMultiplier: book.payoutMultiplier / 100,
			costMultiplier,
			state: book.events,
		},
	});
</script>

{#snippet template(args: TemplateArgs<any>)}
	<ReplayStorySetup setup={args.data.setup}>
		<StoryGameTemplate
			skipLoadingScreen={args.skipLoadingScreen}
			action={async () => {
				await args.action?.(args.data);
			}}
		>
			<StoryLocale lang="en">
				<ReplayAuthenticate>
					<Game />
				</ReplayAuthenticate>
			</StoryLocale>
		</StoryGameTemplate>
	</ReplayStorySetup>
{/snippet}

<!-- Replay gate, BASE mode, 1 USD at cost multiplier 1 — the gate must read
	"BASE 1 USD — 1 USD TOTAL" and hold playback until PLAY is pressed. The book
	is books_base id 28 (8.00x, 3 cascades + tide). After the book resolves the
	panel returns with PLAY AGAIN (same book). Playback/Play Again are driven by
	clicking the panel buttons (the green Action button is a no-op here). -->
<Story
	name="replay-base-1usd"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {
			setup: () => {
				simulateReplayUrl({ mode: 'base', amount: 1_000_000, event: 28 });
				stubReplayFetch(() => replayResponse(books.base, 1));
				return true;
			},
		},
		action: async () => {
			// replay is driven by the PLAY / PLAY AGAIN buttons in the gate panel
		},
	})}
	{template}
/>

<!-- Replay gate, BONUS (Storm Warning) buy at 100x — checklist cost-math case:
	base 1 USD, cost multiplier 100 from the RGS response, gate must read
	"BONUS 1 USD — 100 USD TOTAL" with REAL COST 100 USD. Book books_bonus id 334. -->
<Story
	name="replay-bonus-100x"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {
			setup: () => {
				simulateReplayUrl({ mode: 'bonus', amount: 1_000_000, event: 334 });
				stubReplayFetch(() => replayResponse(books.bonus, 100));
				return true;
			},
		},
		action: async () => {
			// replay is driven by the PLAY / PLAY AGAIN buttons in the gate panel
		},
	})}
	{template}
/>

<!-- Replay data fails to load (RGS 404 NOT_FOUND) — the gate must show the
	REPLAY UNAVAILABLE error panel instead of a PLAY button. -->
<Story
	name="replay-error"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {
			setup: () => {
				simulateReplayUrl({ mode: 'bonus', amount: 1_000_000, event: 999999 });
				stubReplayFetch(() => ({
					status: 404,
					body: { error: 'NOT_FOUND', message: 'Replay data not found.' },
				}));
				return true;
			},
		},
		action: async () => {
			// error panel only — nothing to play
		},
	})}
	{template}
/>
