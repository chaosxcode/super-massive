<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const messageMap = $derived({
		insufficientFunds: i18nDerived.insufficientFunds(),
	});
</script>

{#if stateModal.modal?.name === 'betMessage'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="500px">
			<BaseTitle>
				{i18nDerived.notification()}
			</BaseTitle>
			<BaseScrollable type="column">
				<div class="scrollY info-text" data-test="bet-message-content">
					{messageMap[stateModal.modal.message]}
				</div>
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.info-text {
		text-align: center;
		max-height: 100px;
		max-width: 480px;
		border-radius: 8px;
		border: 1px solid rgba(255, 148, 64, 0.5);
		background: rgba(20, 12, 24, 0.42);
		color: #f4ead9;
		white-space: normal;
		padding: 1rem;
	}
</style>
