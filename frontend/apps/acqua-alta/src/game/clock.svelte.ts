// One shared animation clock for all symbol part rigs — a single rAF driving
// a reactive `now`, instead of one loop per symbol instance.
import { performanceProfile } from './performance.svelte';

export const clock = $state({ now: 0 });

if (typeof window !== 'undefined') {
	const frameInterval = 1000 / performanceProfile.targetFps;
	let previous = 0;
	const step = (t: number) => {
		if (document.visibilityState === 'visible' && t - previous >= frameInterval) {
			clock.now = t;
			previous = t - ((t - previous) % frameInterval);
		}
		requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}
