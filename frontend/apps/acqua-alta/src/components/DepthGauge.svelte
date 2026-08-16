<script lang="ts" module>
	import { GlowFilter } from 'pixi-filters';

	import type { TideMarkName } from '../game/typesBookEvent';

	export type EmitterEventDepthGauge =
		| { type: 'depthGaugeUpdate'; level: number; markName: TideMarkName } // needle tweens to the mark (0.6s, with the water)
		| { type: 'depthGaugeSet'; level: number; markName: TideMarkName } // instant — snapshot/resume restore
		| { type: 'depthGaugeReset' }; // needle sinks back to dry (0.8s, with the drain)

	// pinned + glowing beyond the 194cm record line ("Oltre il Record")
	const RECORD_GLOW = new GlowFilter({
		distance: 12,
		outerStrength: 2.2,
		innerStrength: 0,
		color: 0xf07f2e,
		quality: 0.2,
	});
	// soft ember glow on the needle whenever the flood is up, so the current level
	// reads clearly against the molten tube WITHOUT altering the gauge art
	const ACTIVE_GLOW = new GlowFilter({
		distance: 10,
		outerStrength: 1.8,
		innerStrength: 0,
		color: 0xffa64d,
		quality: 0.2,
	});
</script>

<script lang="ts">
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_SIZES } from '../game/constants';
	import { tween, createTweenToken, type TweenToken } from '../game/tween';

	// HADES SPINS: the rising-underworld marks — the rivers of the underworld.
	// DISPLAY LABELS ONLY: the TideMarkName enum values come from the math
	// books and must never change (see HADES_FORK_NOTES.md).
	const MARKS: { level: number; label: string; cm: number }[] = [
		{ level: 1, label: 'Orbit', cm: 100 },
		{ level: 2, label: 'Photon Ring', cm: 110 },
		{ level: 3, label: 'Ergosphere', cm: 120 },
		{ level: 4, label: 'Horizon', cm: 140 },
		{ level: 5, label: 'Abyss', cm: 160 },
		{ level: 6, label: 'Singularity', cm: 180 },
		{ level: 7, label: 'Supermassive', cm: 194 },
	];

	const MARK_DISPLAY: Record<TideMarkName, string> = {
		Laguna: 'Orbit',
		Sirena: 'Photon Ring',
		Campanella: 'Ergosphere',
		Marangona: 'Lethe',
		Tempesta: 'Cocytus',
		Diluvio: 'Phlegethon',
		AcquaGranda: 'Tartarus',
		OltreIlRecord: 'Beyond Spacetime',
	};

	const PLATE_X = BOARD_SIZES.width + 12;
	const PLATE_WIDTH = 56;
	const MAX_LEVEL = 7;

	const context = getContext();
	// portrait phones have no room for the side labels (they run off the right edge),
	// so we drop the per-tier names there and rely on the active-zone readout + ticks.
	const portrait = $derived(context.stateLayoutDerived.isStacked());

	const markY = (level: number) => BOARD_SIZES.height - Math.min(level, MAX_LEVEL) * SYMBOL_SIZE;

	let needleY = $state(markY(0));
	let markName = $state<TideMarkName | null>(null);
	let pinned = $state(false); // level 8+ — needle pinned at the record line, glowing
	let token: TweenToken = createTweenToken();

	const moveNeedle = async (level: number, duration: number, easing: (t: number) => number) => {
		token.cancelled = true;
		token = createTweenToken();
		await tween({ from: needleY, to: markY(level), duration, easing, onUpdate: (v) => (needleY = v), token }); // prettier-ignore
	};

	context.eventEmitter.subscribeOnMount({
		depthGaugeUpdate: async (emitterEvent) => {
			markName = emitterEvent.markName;
			pinned = emitterEvent.level > MAX_LEVEL;
			await moveNeedle(emitterEvent.level, 600, cubicOut);
		},
		depthGaugeSet: (emitterEvent) => {
			markName = emitterEvent.markName;
			pinned = emitterEvent.level > MAX_LEVEL;
			token.cancelled = true;
			needleY = markY(emitterEvent.level);
		},
		depthGaugeReset: async () => {
			if (markName === null && needleY === markY(0)) return;
			markName = null;
			pinned = false;
			await moveNeedle(0, 800, cubicIn);
		},
	});
</script>

<BoardContainer>
	<Container x={PLATE_X}>
		<!-- EMPTY tube base (brass frame + hollow dark-glass column) -->
		<Sprite key="depth_gauge_body_empty" x={-PLATE_WIDTH * 0.18} width={PLATE_WIDTH * 1.36} height={BOARD_SIZES.height} />

		<!-- the FULL cyan tube, revealed only up to the current waterline so the water
		     visibly rises from the bottom (mask = everything BELOW the needle) -->
		<Container>
			<Rectangle
				isMask
				x={-PLATE_WIDTH * 0.18}
				y={needleY}
				width={PLATE_WIDTH * 1.36}
				height={BOARD_SIZES.height - needleY}
			/>
			<Sprite key="depth_gauge_body" x={-PLATE_WIDTH * 0.18} width={PLATE_WIDTH * 1.36} height={BOARD_SIZES.height} />
		</Container>

		<!-- named tide marks -->
		{#each MARKS as mark}
			<Rectangle
				x={6}
				y={markY(mark.level) - 1}
				width={PLATE_WIDTH - 12}
				height={2}
				backgroundColor={mark.level === MAX_LEVEL ? 0xf07f2e : 0xc9a227}
				backgroundAlpha={mark.level === MAX_LEVEL ? 1 : 0.65}
			/>
			<Text
				anchor={{ x: 0.5, y: 0 }}
				x={PLATE_WIDTH / 2}
				y={markY(mark.level) + 3}
				text={`${mark.cm}`}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 13,
					fontWeight: '700',
					fill: mark.level === MAX_LEVEL ? 0xfff0b0 : 0xfff3c4,
					stroke: { color: 0x140c18, width: 3 },
				}}
			/>
			{#if !portrait}
				<Text
					anchor={{ x: 0, y: 0.5 }}
					x={PLATE_WIDTH + 10}
					y={markY(mark.level)}
					text={mark.label}
					style={{
						fontFamily: 'proxima-nova',
						fontSize: 15,
						fontWeight: '700',
						fill: mark.level === MAX_LEVEL ? 0xfff0b0 : 0xfff3c4,
						stroke: { color: 0x140c18, width: 3 },
					}}
				/>
			{/if}
		{/each}

		<!-- needle (final brass pointer art; record-pinned = amber glow tint) -->
		<Container y={needleY} filters={pinned ? [RECORD_GLOW] : markName ? [ACTIVE_GLOW] : []}>
			<Sprite
				key="depth_gauge_needle"
				anchor={{ x: 0.15, y: 0.5 }}
				x={-10}
				width={PLATE_WIDTH + 14}
				height={(PLATE_WIDTH + 14) * 0.5}
				tint={pinned ? 0xf07f2e : 0xffffff}
			/>
		</Container>

		<!-- current mark readout -->
		{#if markName}
			<Text
				anchor={{ x: 0.5, y: 1 }}
				x={PLATE_WIDTH / 2}
				y={-8}
				text={MARK_DISPLAY[markName]}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 16,
					fontWeight: '700',
					fill: markName === 'OltreIlRecord' ? 0xffb45e : 0xfff3c4,
					stroke: { color: 0x140c18, width: 3 },
				}}
			/>
		{/if}
	</Container>
</BoardContainer>
