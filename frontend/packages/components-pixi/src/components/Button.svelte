<script lang="ts" module>
	import type { Snippet } from 'svelte';

	import { Rectangle as HitAreaRectangle } from 'pixi.js';

	import {
		Container,
		Rectangle,
		anchorToPivot,
		type ContainerProps,
		type Sizes,
		type PixiPoint,
	} from 'pixi-svelte';

	type ContainerPropsToOmit =
		| 'eventMode'
		| 'cursor'
		| 'pivot'
		| 'children'
		| 'onpointerover'
		| 'onpointerout'
		| 'onpointerdown'
		| 'onpointerup';

	export type Props = Omit<ContainerProps, ContainerPropsToOmit> & {
		sizes: Sizes;
		onpress: () => void;
		disabled?: boolean;
		anchor?: PixiPoint;
		children: Snippet<
			[
				{
					center: { x: number; y: number };
					hovered: boolean;
					pressed: boolean;
				},
			]
		>;
		debug?: boolean;
	};
</script>

<script lang="ts">
	const { children, sizes, anchor, disabled, onpress, debug, ...containerProps }: Props = $props();
	const center = $derived({
		x: sizes.width * 0.5,
		y: sizes.height * 0.5,
	});
	// Constrain the tap/hit target to the button's declared footprint. Without an
	// explicit hitArea, PixiJS derives the interactive region from the union of all
	// child bounds, so decorative art drawn larger than `sizes` (glows, oversized
	// icons) bleeds the hitbox into neighbouring buttons and adjacent tap targets
	// overlap — e.g. a tap on the Play button firing the Turbo toggle on mobile.
	const hitArea = $derived(new HitAreaRectangle(0, 0, sizes.width, sizes.height));

	let hovered = $state(false);
	let pressed = $state(false);

	$effect(() => {
		if (disabled) {
			hovered = false;
			pressed = false;
		}
	});
</script>

<Container
	{...containerProps}
	eventMode="static"
	cursor={disabled ? 'not-allowed' : 'pointer'}
	pivot={anchorToPivot({ sizes, anchor })}
	{hitArea}
	onpointerover={() => {
		if (disabled) return;
		hovered = true;
	}}
	onpointerout={() => {
		if (disabled) return;
		hovered = false;
	}}
	onpointerdown={() => {
		if (disabled) return;
		pressed = true;
	}}
	onpointerup={() => {
		if (disabled) return;
		pressed = false;
		onpress();
	}}
>
	{#if debug}
		<Rectangle
			width={sizes.width}
			height={sizes.height}
			alpha={0.5}
			borderWidth={2}
			borderColor={0xffffff}
		/>
	{/if}
	{@render children({ center, hovered, pressed })}
</Container>
