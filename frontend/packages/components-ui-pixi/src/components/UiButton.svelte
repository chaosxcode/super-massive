<script lang="ts">
	import { Text, Sprite, Rectangle } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';

	import UiSprite from './UiSprite.svelte';
	import type { ButtonIcon } from '../types';
	import type { Snippet } from 'svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = Omit<ButtonProps, 'children'> & {
		icon: ButtonIcon;
		sizes: { width: number; height: number };
		active?: boolean;
		children?: Snippet;
		variant?: 'dark' | 'light';
	};

	const {
		icon,
		active,
		variant = 'dark',
		children: childrenFromParent,
		...buttonProps
	}: Props = $props();

	// icons we have premium gold art for -> render the image instead of text
	const ICON_IMG: Partial<Record<ButtonIcon, string>> = {
		menu: 'btn_menu',
		turbo: 'btn_turbo',
		autoSpin: 'btn_autoplay',
		soundOn: 'btn_sound_on',
		soundOff: 'btn_sound_off',
		decrease: 'btn_minus',
		increase: 'btn_plus',
		payTable: 'btn_paytable',
		settings: 'btn_settings',
		info: 'btn_info',
		menuExit: 'btn_close',
	};
	const imgKey = $derived(ICON_IMG[icon]);
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		{#if imgKey}
			<!-- soft navy gradient halo (matches balance/bet) so buttons never wash out -->
			<Sprite
				{...center}
				key="label_fade"
				anchor={0.5}
				width={buttonProps.sizes.width * 1.7}
				height={buttonProps.sizes.height * 1.7}
			/>
			<!-- active (e.g. turbo on) = pressed-in: aqua ring + darker, smaller -->
			<Rectangle
				{...center}
				anchor={0.5}
				width={buttonProps.sizes.width}
				height={buttonProps.sizes.height}
				borderRadius={999}
				backgroundColor={active ? 0x8f2f7a : 0x120a16}
				backgroundAlpha={active ? 0.8 : 0.45}
				{...active ? { borderWidth: 6, borderColor: 0xd45fb8 } : {}}
			/>
			<Sprite
				{...center}
				key={imgKey}
				anchor={0.5}
				width={buttonProps.sizes.width * (active ? 0.9 : 1.06)}
				height={buttonProps.sizes.height * (active ? 0.9 : 1.06)}
				tint={buttonProps.disabled ? 0x9aa3a8 : active ? 0xbfeee8 : 0xffffff}
			/>
		{:else}
			<UiSprite
				{...center}
				anchor={0.5}
				width={buttonProps.sizes.width}
				height={buttonProps.sizes.height}
				backgroundColor={variant === 'dark' ? 0x241426 : 0xffffff}
				backgroundAlpha={0.85}
				{...buttonProps.disabled
					? {
							backgroundColor: 0xaaaaaa,
						}
					: {}}
				{...active
					? {
							borderWidth: 10,
							borderColor: variant === 'dark' ? 0xffffff : 0x000000,
						}
					: {}}
			/>

			<Text
				{...center}
				anchor={0.5}
				text={i18nDerived[icon]()}
				style={{
					align: 'center',
					wordWrap: true,
					wordWrapWidth: 200,
					fontFamily: 'proxima-nova',
					fontWeight: '600',
					fontSize: UI_BASE_FONT_SIZE * 0.9,
					fill: variant === 'dark' ? 0xffffff : 0x000000,
				}}
			/>
		{/if}

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
