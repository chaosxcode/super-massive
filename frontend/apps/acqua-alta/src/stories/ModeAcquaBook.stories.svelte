<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'MODE_ACQUA/book',
	});
</script>

<script lang="ts">
	import {
		StoryGameTemplate,
		StoryLocale,
		type TemplateArgs,
		templateArgs,
	} from 'components-storybook';

	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { playBet } from '../game/utils';
	import books from './data/acqua_books';

	setContext();
</script>

{#snippet template(args: TemplateArgs<any>)}
	<StoryGameTemplate
		skipLoadingScreen={args.skipLoadingScreen}
		action={async () => {
			await args.action?.(args.data);
		}}
	>
		<StoryLocale lang="en">
			<Game />
		</StoryLocale>
	</StoryGameTemplate>
{/snippet}

<!-- `base` mode pure-basegame win (books_base id 28, 8.00x): three winning
	cascades each running winInfo -> updateTumbleWin -> tumbleBoard -> tideLevel ->
	updateGrid (deviation 5 order), the tide climbing Laguna -> Sirena ->
	Campanella (level 3). The flood drains on the next reveal. -->
<Story
	name="base-cascade-tide"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = books.base;
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<!-- `ante` (Lagoon Surge) basegame spin straight off CONTRACT.md:
	reveal -> tideLevel(level=1, PRE-SUBMERGED bottom row) -> updateGrid, then two
	winning cascades each ending winInfo -> updateTumbleWin -> tumbleBoard ->
	tideLevel -> updateGrid (water rises AFTER the refill settles, deviation 5),
	tide peaking at Campanella. The flood drains on the next reveal. -->
<Story
	name="ante-tide-basegame"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = books.ante;
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<!-- NATURAL free spin entry (books_base id 2205, 10.00x): a 4-scatter
	freeSpinTrigger lands in the base game (10 spins), then a freegame 3-scatter
	freeSpinRetrigger (+5 spins) — dry entry, reveal -> updateGrid re-sync on
	every free spin (deviation 2), flood persisting across the bonus. -->
<Story
	name="natural-trigger-retrigger"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = books.retrigger;
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<!-- `bonus` (Storm Warning) buy: 4-scatter freeSpinTrigger, DRY freegame entry
	(reveal -> updateGrid re-sync, no tideLevel — CONTRACT.md deviation 2), the
	flood persisting across free spins plus a freegame tideLevel. -->
<Story
	name="bonus-storm-warning"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = books.bonus;
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<!-- `superbonus` (Acqua Granda) buy: basegame cascade, then PRE-FLOODED freegame
	entry — reveal -> tideLevel(level=3, rows x4/x3/x2 bottom-up) -> updateGrid —
	with the tide persisting for the whole bonus. -->
<Story
	name="superbonus-acqua-granda"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = books.superbonus;
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>

<!-- WINCAP (books_base id 1413, criteria `wincap`, payoutMultiplier 500000 =
	the 5000x cap): natural trigger + retrigger, tide to OltreIlRecord (level
	12), then the round terminates the moment the cap is hit — winInfo ->
	updateTumbleWin -> `wincap` (deviation 1: full-screen flood sweep + MAX WIN
	plaque + shard fireworks + maxwin sting) -> setTotalWin -> freeSpinEnd ->
	finalWin. No cascade/tide events after the cap. -->
<Story
	name="wincap-max-win"
	args={templateArgs({
		skipLoadingScreen: true,
		data: {},
		action: async () => {
			const data = books.wincap;
			await playBet({ ...data, state: data.events });
		},
	})}
	{template}
/>
