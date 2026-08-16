<script lang="ts">
	import { Container, Text, Sprite, Rectangle } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived, stateModal } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	// insufficient balance only greys the art — the button STAYS clickable so the
	// press can surface the insufficient-balance message (Stake approval req.)
	const insufficient = $derived(!stateBetDerived.isBetCostAvailable());
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		<!-- space must NOT spin while any menu/modal is open (bonus buy, info,
		     paytable, settings, bet menu) — Stake approval requirement -->
		<OnHotkey hotkey="Space" disabled={insufficient || stateModal.modal !== null} {onpress} />
		<Button {...props} {sizes} {onpress}>
			{#snippet children({ center, hovered })}
				<Container {...center}>
					<!-- soft navy gradient backing (matches balance/bet) so it never washes out -->
					<Sprite
						key="label_fade"
						anchor={0.5}
						width={sizes.width * 2.05}
						height={sizes.height * 2.05}
					/>
					<!-- big gold spin button -->
					<Sprite
						key="btn_spin"
						anchor={0.5}
						width={sizes.width * 1.62}
						height={sizes.height * 1.62}
						tint={insufficient || ['spin_disabled', 'stop_disabled'].includes(key)
							? 0x9aa3a8
							: 0xffffff}
					/>
					{#if !['spin_default', 'spin_disabled'].includes(key)}
						<Text
							anchor={0.5}
							text={i18nDerived.stop()}
							style={{
								align: 'center',
								fontFamily: 'proxima-nova',
								fontWeight: '700',
								fontSize: UI_BASE_FONT_SIZE,
								fill: 0xffffff,
							}}
						/>
					{/if}
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
