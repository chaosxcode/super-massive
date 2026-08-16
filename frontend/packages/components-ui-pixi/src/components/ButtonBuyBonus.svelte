<script lang="ts">
	import { Text, Sprite, Rectangle } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateModal, stateBet, stateBetDerived } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { getContext } from '../context';
	import { i18nDerived } from '../i18n/i18nDerived';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const { stateXstateDerived, eventEmitter } = getContext();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
	const disabled = $derived(!stateXstateDerived.isIdle());
	const active = $derived(stateBetDerived.activeBetMode()?.type === 'activate');

	const openModal = () => (stateModal.modal = { name: 'buyBonus' });
	const disableActiveBetMode = () => (stateBet.activeBetModeKey = 'BASE');
	const onpress = () => {
		eventEmitter.broadcast({ type: 'soundPressGeneral' });

		if (active) {
			disableActiveBetMode();
		} else {
			openModal();
		}
	};

	const getState = (value: {
		active: boolean;
		disabled: boolean;
		hovered: boolean;
		pressed: boolean;
	}) => {
		if (value.disabled) return 'disabled' as const;
		if (value.pressed) return 'pressed' as const;
		if (value.hovered) return 'hovered' as const;
		if (value.active) return 'active' as const;
		return 'default' as const;
	};
</script>

<Button {...props} {sizes} {disabled} {onpress}>
	{#snippet children({ center, hovered, pressed })}
		{@const state = getState({
			active,
			disabled,
			hovered,
			pressed,
		})}

		<!-- larger + darker soft navy gradient halo so the gold icon stays visible -->
		<Sprite {...center} key="label_fade" anchor={0.5} width={sizes.width * 2.1} height={sizes.height * 2.1} />
		<Rectangle
			{...center}
			anchor={0.5}
			width={sizes.width * 1.12}
			height={sizes.height * 1.12}
			borderRadius={999}
			backgroundColor={0x120a16}
			backgroundAlpha={0.62}
			{...active ? { borderWidth: 6, borderColor: 0xd45fb8 } : {}}
		/>
		<!-- Buy Bonus = trident + lightning storm emblem -->
		<Sprite
			{...center}
			key="buy_icon_storm"
			anchor={0.5}
			width={sizes.width * 1.12}
			height={sizes.height * 1.12}
			tint={disabled ? 0x9aa3a8 : 0xffffff}
		/>
		{#if state === 'active'}
			<Text
				{...center}
				anchor={0.5}
				text={i18nDerived.disable()}
				style={{
					align: 'center',
					fontFamily: 'proxima-nova',
					fontWeight: '700',
					fontSize: UI_BASE_FONT_SIZE * 0.8,
					fill: 0xffffff,
				}}
			/>
		{/if}
	{/snippet}
</Button>
