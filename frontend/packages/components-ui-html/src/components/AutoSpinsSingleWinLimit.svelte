<script lang="ts">
	import { stateUi, SINGLE_WIN_LIMIT_TEXT_OPTIONS } from 'state-shared';
	import { OptionsGrid } from 'components-shared';

	import BaseIcon from './BaseIcon.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
</script>

<span class="title">{i18nDerived.singleWinLimit()}</span>

<OptionsGrid
	miniSize
	value={stateUi.autoSpinsSingleWinLimitText}
	options={SINGLE_WIN_LIMIT_TEXT_OPTIONS}
	onchange={(value) => (stateUi.autoSpinsSingleWinLimitText = value)}
>
	{#snippet option({ option })}
		<BaseIcon
			width="100%"
			height="2rem"
			background={option === stateUi.autoSpinsSingleWinLimitText
				? 'linear-gradient(180deg, rgba(255, 148, 64, 0.28), rgba(8, 30, 44, 0.92))'
				: 'linear-gradient(180deg, rgba(52, 27, 66, 0.85), rgba(24, 12, 32, 0.92))'}
			border={option === stateUi.autoSpinsSingleWinLimitText
				? '2px solid #ff9440'
				: '2px solid rgba(255, 148, 64, 0.28)'}
		/>
		<BaseButtonContent>
			<span
				style="font-size: 1rem;"
				class:infinity={option === '∞'}
				class="option-wrap"
				data-test="single-win-limit-options"
			>
				{option}
			</span>
		</BaseButtonContent>
	{/snippet}
</OptionsGrid>

<style lang="scss">
	.title {
		line-height: 2rem;
	}

	.option-wrap {
		white-space: nowrap;
	}

	.infinity {
		font-size: 1.5rem;
		line-height: 1rem;
		margin-top: 0.3rem;
		vertical-align: middle;
	}
</style>
