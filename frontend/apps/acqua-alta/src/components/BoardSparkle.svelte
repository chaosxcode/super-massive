<script lang="ts">
	// Ambient juice: bright little WHITE GLITTER specks twinkle in at random times
	// on random symbol cells, pop, drift up a touch, and fade. Shiny, not flashy.
	import { onMount } from 'svelte';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { Sprite } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	import { tween, createTweenToken } from '../game/tween';

	type Glint = { id: number; x: number; y: number; alpha: number; scale: number; size: number; key: string };

	let glints = $state<Glint[]>([]);
	let id = 0;

	const spawn = () => {
		const reel = Math.floor(Math.random() * BOARD_DIMENSIONS.x);
		const row = Math.floor(Math.random() * BOARD_DIMENSIONS.y);
		const x = (reel + 0.5) * SYMBOL_SIZE + (Math.random() - 0.5) * SYMBOL_SIZE * 0.65;
		const y = (row + 0.5) * SYMBOL_SIZE + (Math.random() - 0.5) * SYMBOL_SIZE * 0.65;
		// Gold flecks, NOT `particle_bubble`/`particle_droplet` — those are water
		// assets left over from the Acqua Alta fork, and they read as droplets
		// flying around a black hole. They went unnoticed for so long only because
		// the proxy bug below kept every glint frozen and effectively invisible;
		// fixing that made them appear, which is how they were finally spotted.
		const size = SYMBOL_SIZE * (0.05 + Math.random() * 0.035); // ~7-12px, ambient
		const key = 'particle_gold_fleck';
		const glint: Glint = { id: (id += 1), x, y, alpha: 0, scale: 0.2, size, key };
		glints.push(glint);
		// Svelte 5's $state array stores a NEW proxy WRAPPING the pushed object, so
		// the local literal is detached — animating it leaves the rendered glint
		// frozen at its initial values. Read the live element back and animate that.
		// (Same bug that stopped wildEjecta's flight animation ever running.)
		const g = glints[glints.length - 1];

		const t = createTweenToken();
		const life = 820 + Math.random() * 520;
		// twinkle: a restrained swell and fade while drifting up a touch. Kept
		// deliberately subtle — this is ambient depth behind the symbols, not an
		// effect that should pull the eye off a spin.
		tween({ from: 0.35, to: 0.85, duration: life * 0.42, easing: cubicOut, onUpdate: (v) => (g.scale = v), token: t }); // prettier-ignore
		tween({ from: 0, to: 0.42, duration: life * 0.36, easing: cubicOut, onUpdate: (v) => (g.alpha = v), token: t }); // prettier-ignore
		tween({ from: y, to: y - SYMBOL_SIZE * 0.28, duration: life, easing: cubicOut, onUpdate: (v) => (g.y = v), token: t }); // prettier-ignore
		tween({ from: 0.42, to: 0, duration: life * 0.78, easing: cubicIn, onUpdate: (v) => (g.alpha = v), token: t }) // prettier-ignore
			.then(() => {
				glints = glints.filter((existing) => existing.id !== glint.id);
			});
	};

	onMount(() => {
		let alive = true;
		(async () => {
			await waitForTimeout(300);
			while (alive) {
				spawn();
				await waitForTimeout(620 + Math.random() * 900);
			}
		})();
		return () => {
			alive = false;
		};
	});
</script>

<BoardContainer>
	{#each glints as g (g.id)}
		<Sprite
			anchor={0.5}
			key={g.key}
			x={g.x}
			y={g.y}
			width={g.size}
			height={g.size}
			scale={g.scale}
			alpha={g.alpha}
			tint={0xffffff}
		/>
	{/each}
</BoardContainer>
