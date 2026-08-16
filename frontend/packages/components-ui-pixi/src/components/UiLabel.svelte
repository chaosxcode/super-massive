<script lang="ts">
	import { Sprite, Text } from 'pixi-svelte';

	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = {
		label: string;
		value: string;
		tiled?: boolean;
		stacked?: boolean;
		backdrop?: boolean;
	};

	const props: Props = $props();

	// no plate — clean text so it never covers the reels
	const labelStyle = {
		fontFamily: 'proxima-nova',
		fontSize: UI_BASE_FONT_SIZE * 0.8,
		fontWeight: '600',
		letterSpacing: 1,
		fill: 0xd9b8e8,
	} as const;

	const valueStyle = {
		fontFamily: 'proxima-nova',
		fontSize: UI_BASE_FONT_SIZE,
		fontWeight: '700',
		fill: 0xffd9ad,
	} as const;
</script>

{#if props.stacked}
	{#if props.backdrop}
		<Sprite
			key="label_fade"
			anchor={0.5}
			x={0}
			y={UI_BASE_FONT_SIZE * 0.95}
			width={UI_BASE_FONT_SIZE * 9}
			height={UI_BASE_FONT_SIZE * 3.5}
		/>
	{/if}
	<Text anchor={{ x: 0.5, y: 0 }} text={props.label} style={labelStyle} />
	<Text anchor={{ x: 0.5, y: 0 }} text={props.value} style={valueStyle} y={UI_BASE_FONT_SIZE} />
{:else}
	{#if props.backdrop}
		<Sprite
			key="label_fade"
			anchor={0.5}
			x={UI_BASE_FONT_SIZE * 5}
			y={0}
			width={UI_BASE_FONT_SIZE * 14}
			height={UI_BASE_FONT_SIZE * 2.8}
		/>
	{/if}
	<Text anchor={{ x: 0, y: 0.5 }} text={props.label} style={labelStyle} />
	<Text anchor={{ x: 1, y: 0.5 }} text={props.value} style={valueStyle} x={UI_BASE_FONT_SIZE * 10} />
{/if}
