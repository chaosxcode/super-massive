<script lang="ts">
	import { OptionsGrid } from 'components-shared';
	import { getContextLayout } from 'utils-layout';
	import { stateBet, stateConfig } from 'state-shared';

	import BaseIcon from './BaseIcon.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const { stateLayoutDerived } = getContextLayout();
	const count = $derived(stateLayoutDerived.layoutType() === 'landscape' ? 15 : 18);
	const options = $derived(
		[
			...stateConfig.betMenuOptions.slice(0, count - 1),
			...stateConfig.betMenuOptions.slice(-1),
		].filter((value, index, array) => array.indexOf(value) === index),
	); //always includes last, and without duplicate

	const isMaxValue = (value: number) => value === options[options.length - 1];
	// Reviewer requested the full number, not a K/M abbreviation (e.g. "500,000.00",
	// not "500.00K") — always show 2 decimals with thousand separators.
	const formatValue = (value: number) =>
		Math.abs(value).toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
</script>

<OptionsGrid
	value={stateBet.betAmount}
	{options}
	onchange={(value) => (stateBet.betAmount = value)}
>
	{#snippet option({ option })}
		<BaseIcon
			width="100%"
			height="2rem"
			border={option === stateBet.betAmount ? '2px white solid' : '2px black solid'}
		/>
		<BaseButtonContent>
			<!-- px floor: the html root font halves under 500px (Modals.svelte), which
			     turned 1rem into unreadable 8px on phones (review finding) -->
			<span style="font-size: max(1rem, 13px);"
				>{isMaxValue(option) ? i18nDerived.max() : formatValue(option)}</span
			>
		</BaseButtonContent>
	{/snippet}
</OptionsGrid>
