import { clock } from './clock.svelte';

export const LIGHT_TINT_HOT = 0xfff0ba;
export const LIGHT_TINT_WARM = 0xffa044;
export const LIGHT_TINT_COLD = 0x8defff;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const lightFlicker = (seed = 0) => {
	const t = clock.now + seed;
	const slow = 0.5 + 0.5 * Math.sin(t / 380);
	const fast = 0.5 + 0.5 * Math.sin(t / 53 + 1.7);
	const hotPop = Math.max(0, Math.sin(t / 117 + 0.4)) ** 8;
	const stutter = Math.max(0, Math.sin(t / 29 + seed * 0.017)) ** 14;

	return clamp01(0.18 + slow * 0.28 + fast * 0.24 + hotPop * 0.42 + stutter * 0.5);
};

// One scene-level power signal shared by the canvas, symbol highlights, and
// DOM mascot overlays. It is irregular but spatially stationary, so the whole
// scene breathes under one light without bringing back a travelling beam.
export const sceneLightPulse = () => {
	const t = clock.now;
	const swell = 0.5 + 0.5 * Math.sin(t / 285 + 0.35);
	const flutter = 0.5 + 0.5 * Math.sin(t / 73 + Math.sin(t / 410) * 1.4);
	const brightTick = Math.max(0, Math.sin(t / 137 + 1.1)) ** 10;
	const shortDip = Math.max(0, Math.sin(t / 191 + 2.7)) ** 18;

	return clamp01(0.22 + swell * 0.38 + flutter * 0.2 + brightTick * 0.28 - shortDip * 0.16);
};

export const lightSweepProgress = (periodMs: number, sweepMs: number, seed = 0) => {
	const t = (clock.now + seed) % periodMs;
	return t < sweepMs ? t / sweepMs : -1;
};

export const lightSweepAlpha = (progress: number, seed = 0) => {
	if (progress < 0) return 0;
	return clamp01(Math.sin(progress * Math.PI) * (0.55 + lightFlicker(seed) * 0.75));
};
