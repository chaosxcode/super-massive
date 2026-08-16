<script lang="ts">
	import { getContextLayout } from 'utils-layout';
	import { stateUi, AUTO_SPINS_TEXT_OPTIONS } from 'state-shared';
	import { OptionsGrid } from 'components-shared';

	import BaseIcon from './BaseIcon.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';

	const { stateLayoutDerived } = getContextLayout();
	const AUTO_SPINS_TEXT_OPTIONS_PORTRAIT = AUTO_SPINS_TEXT_OPTIONS.filter(
		(value) => value !== '1000',
	);

	const options = $derived(
		stateLayoutDerived.layoutType() === 'landscape'
			? AUTO_SPINS_TEXT_OPTIONS_PORTRAIT
			: AUTO_SPINS_TEXT_OPTIONS,
	);
</script>

<OptionsGrid
	value={stateUi.autoSpinsText}
	{options}
	onchange={(value) => (stateUi.autoSpinsText = value)}
>
	{#snippet option({ option })}
		<BaseIcon
			width="100%"
			height="2rem"
			background={option === stateUi.autoSpinsText
				? 'linear-gradient(180deg, rgba(255, 148, 64, 0.28), rgba(8, 30, 44, 0.92))'
				: 'linear-gradient(180deg, rgba(52, 27, 66, 0.85), rgba(24, 12, 32, 0.92))'}
			border={option === stateUi.autoSpinsText
				? '2px solid #ff9440'
				: '2px solid rgba(255, 148, 64, 0.28)'}
		/>
		<BaseButtonContent>
			<!-- px floor: the html root font halves under 500px (Modals.svelte) —
			     1rem rendered 8px on phones (review finding) -->
			<span style="font-size: max(1rem, 13px);" class:infinity={option === '∞'} data-test="round-options">
				{option}
			</span>
		</BaseButtonContent>
	{/snippet}
</OptionsGrid>

<style lang="scss">
	.infinity {
		font-size: 1.5rem;
		line-height: 1rem;
		margin-top: 0.3rem;
	}
</style>
