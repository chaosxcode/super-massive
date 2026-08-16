// Minimal rAF tween helper for programmatic Pixi animation (de-Spine pass).
//
// Unlike svelte/motion's Tween, an interrupted tween here RESOLVES immediately
// (never hangs an awaited animation chain) — important because book event
// handlers await symbol/win animations and must always make progress.
import { performanceProfile } from './performance.svelte';

export type TweenToken = { cancelled: boolean };

export const createTweenToken = (): TweenToken => ({ cancelled: false });

export const tween = ({
	from,
	to,
	duration,
	easing = (t) => t,
	onUpdate,
	token,
}: {
	from: number;
	to: number;
	duration: number;
	easing?: (t: number) => number;
	onUpdate: (value: number) => void;
	token?: TweenToken;
}) =>
	new Promise<void>((resolve) => {
		if (token?.cancelled || duration <= 0) {
			if (!token?.cancelled) onUpdate(to);
			resolve();
			return;
		}

		const start = performance.now();
		const frameInterval = 1000 / performanceProfile.targetFps;
		let previousUpdate = start - frameInterval;

		const step = (now: number) => {
			if (token?.cancelled) {
				resolve();
				return;
			}

			const progress = Math.min((now - start) / duration, 1);
			if (progress === 1 || now - previousUpdate >= frameInterval) {
				onUpdate(from + (to - from) * easing(progress));
				previousUpdate = now;
			}

			if (progress < 1) {
				requestAnimationFrame(step);
			} else {
				resolve();
			}
		};

		requestAnimationFrame(step);
	});
