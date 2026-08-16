<script lang="ts">
	// The cat's safety tether: a verlet rope clipped to the crown vortex,
	// whipping around in zero-g. DOM <canvas> overlay under the mascot layer
	// (z-5). Endpoints re-pinned every frame: A = frameVortexScreenPoint(), the
	// ONE shared anchor the pixi vortex and the mascot's boot also resolve to;
	// B = the cat's harness, read LIVE from the mascot's .tether-anchor rect so
	// his depth drift and Cat Rescue flight drag the rope with him.
	// House-style render: ink outline + cream core + specular thread.
	import { onMount } from 'svelte';


	import { getContext } from '../game/context';
	import { frameVortexScreenPoint } from '../game/constants';
	import { performanceProfile } from '../game/performance.svelte';

	const context = getContext();
	const L = context.stateLayoutDerived;

	const N = performanceProfile.reducedEffects ? 14 : 26; // segments
	const SLACK = 1.18; // rope longer than the span — it hangs and whips
	let canvasEl: HTMLCanvasElement;
	let yank = 0; // Cat Rescue impulse toward the hole, decays. Ordinary cascades
	// never touch the rope — only the server-authored catSnap sequence does.

	let snapped = false; // tether broken during the cat-snap gag
	let resetRequested = false;
	let snapTimer: ReturnType<typeof setTimeout> | undefined;
	// The rope fades out under plaques/transitions: it is a DOM layer above the
	// canvas and must never draw over a popup. The menu draws in the canvas BELOW
	// this layer and the mascot hides himself on it, so the rope has to vanish
	// with him or it hangs from the vortex to nobody.
	let fade = 1;
	let uiHidden = false;
	// The rope tracks the CAT, not the menu — the mascot no longer hides on
	// menuOpen, so fading the rope there would strand it visually again.
	const fadeTarget = () => (uiHidden ? 0 : 1);
	context.eventEmitter.subscribeOnMount({
		uiHide: () => (uiHidden = true),
		uiShow: () => (uiHidden = false),
		catSnapPlay: () => {
			snapped = true;
			yank = 1.6;
			clearTimeout(snapTimer);
			// Defensive fallback only. The mascot explicitly reconnects during its
			// reverse flight and resets this rope after the landing settle.
			snapTimer = setTimeout(() => (snapped = false), 5000);
		},
		mascotTetherReconnect: () => {
			clearTimeout(snapTimer);
			snapped = false;
			resetRequested = true;
		},
		mascotTetherReset: () => {
			clearTimeout(snapTimer);
			snapped = false;
			yank = 0;
			resetRequested = true;
		},
	});

	onMount(() => {
		const ctx2d = canvasEl.getContext('2d')!;
		type P = { x: number; y: number; px: number; py: number };
		let pts: P[] = [];
		let rafId = 0;
		let t = 0;
		let previousUpdate = 0;
		const frameInterval = 1000 / performanceProfile.targetFps;

		// The ONE shared anchor — never recomputed here, never a CSS percentage.
		const anchorA = () => frameVortexScreenPoint(L);
		const anchorB = () => {
			// Live harness point owned by the mascot, including its mobile scale and
			// 20-second depth transform.
			const el = document.querySelector('.poseidon-mascot .tether-anchor') as HTMLElement | null;
			if (!el) return null;
			const r = el.getBoundingClientRect();
			return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
		};

		const init = () => {
			const a = anchorA();
			const b = anchorB() ?? { x: a.x - 300, y: a.y };
			pts = Array.from({ length: N + 1 }, (_, i) => {
				const u = i / N;
				const x = a.x + (b.x - a.x) * u;
				const y = a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * 40;
				return { x, y, px: x, py: y };
			});
		};
		init();

		const step = (now: number) => {
			if (previousUpdate !== 0 && now - previousUpdate < frameInterval) {
				rafId = requestAnimationFrame(step);
				return;
			}
			previousUpdate = now;
			t += 1;
			const a = anchorA();
			const b = anchorB();
			const W = window.innerWidth;
			const H = window.innerHeight;
			if (canvasEl.width !== W) canvasEl.width = W;
			if (canvasEl.height !== H) canvasEl.height = H;
			if (resetRequested) {
				init();
				resetRequested = false;
			}

			if (b) {
				const span = Math.hypot(b.x - a.x, b.y - a.y);
				const seg = (span * SLACK) / N;
				yank *= 0.92;

				// verlet integrate
				for (let i = 1; i < N; i += 1) {
					const p = pts[i];
					const vx = (p.x - p.px) * 0.985;
					const vy = (p.y - p.py) * 0.985;
					p.px = p.x;
					p.py = p.y;
					// zero-g drift + gentle turbulence + Cat Rescue yank toward the hole
					const u = i / N;
					const sway = Math.sin(t * 0.02 + u * 5.2) * 0.05 + Math.sin(t * 0.007 + u * 11.4) * 0.04;
					p.x += vx + sway + yank * 1.6 * Math.sin(u * Math.PI);
					p.y += vy + Math.cos(t * 0.013 + u * 7.7) * 0.05 + 0.02; // whisper of gravity
				}
				// pin ends, relax constraints (free end while the tether is snapped)
				pts[0].x = a.x;
				pts[0].y = a.y;
				if (!snapped) {
					pts[N].x = b.x;
					pts[N].y = b.y;
				} else {
					pts[N].x += 1.2 + Math.sin(t * 0.05) * 0.8;
				}
				const constraintPasses = performanceProfile.reducedEffects ? 2 : 4;
				for (let k = 0; k < constraintPasses; k += 1) {
					for (let i = 0; i < N; i += 1) {
						const p1 = pts[i];
						const p2 = pts[i + 1];
						const dx = p2.x - p1.x;
						const dy = p2.y - p1.y;
						const d = Math.hypot(dx, dy) || 1;
						const diff = ((d - seg) / d) * 0.5;
						const ox = dx * diff;
						const oy = dy * diff;
						if (i > 0) {
							p1.x += ox;
							p1.y += oy;
						}
						if (i < N) {
							p2.x -= ox;
							p2.y -= oy;
						}
					}
					pts[0].x = a.x;
					pts[0].y = a.y;
					if (!snapped) {
						pts[N].x = b.x;
						pts[N].y = b.y;
					}
				}
			}

			// draw: smooth quadratic through midpoints, layered strokes
			ctx2d.clearRect(0, 0, W, H);
			fade += (fadeTarget() - fade) * 0.12;
			ctx2d.globalAlpha = fade;
			if (b && fade > 0.02) {
				const path = () => {
					ctx2d.beginPath();
					ctx2d.moveTo(pts[0].x, pts[0].y);
					for (let i = 1; i < N; i += 1) {
						const mx = (pts[i].x + pts[i + 1].x) / 2;
						const my = (pts[i].y + pts[i + 1].y) / 2;
						ctx2d.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
					}
					ctx2d.lineTo(pts[N].x, pts[N].y);
				};
				ctx2d.lineCap = 'round';
				ctx2d.lineJoin = 'round';
				path();
				ctx2d.strokeStyle = 'rgba(16, 8, 26, 0.9)'; // ink
				ctx2d.lineWidth = 7;
				ctx2d.stroke();
				path();
				ctx2d.strokeStyle = '#f6ead2'; // cream cord
				ctx2d.lineWidth = 3.4;
				ctx2d.stroke();
				if (!performanceProfile.reducedEffects) {
					path();
					ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.55)'; // specular thread
					ctx2d.lineWidth = 1.1;
					ctx2d.stroke();
				}
				// brass clip rings at both ends
				for (const e of [pts[0], pts[N]]) {
					ctx2d.beginPath();
					ctx2d.arc(e.x, e.y, 6.5, 0, Math.PI * 2);
					ctx2d.fillStyle = '#10081a';
					ctx2d.fill();
					ctx2d.beginPath();
					ctx2d.arc(e.x, e.y, 4.5, 0, Math.PI * 2);
					ctx2d.fillStyle = '#eebd52';
					ctx2d.fill();
				}
			}
			rafId = requestAnimationFrame(step);
		};
		rafId = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(rafId);
			clearTimeout(snapTimer);
		};
	});
</script>

<canvas class="tether" bind:this={canvasEl} aria-hidden="true"></canvas>

<style>
	.tether {
		position: fixed;
		inset: 0;
		z-index: 5; /* over the game canvas, under the mascot (z-6) */
		pointer-events: none;
	}
</style>
