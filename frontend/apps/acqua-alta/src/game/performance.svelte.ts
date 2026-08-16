export type PerformanceTier = 'high' | 'balanced' | 'low';

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

const detectProfile = () => {
	if (typeof window === 'undefined') {
		return {
			tier: 'high' as PerformanceTier,
			isMobile: false,
			reducedEffects: false,
			resolution: 1,
			antialias: true,
			targetFps: 60,
		};
	}

	const params = new URLSearchParams(window.location.search);
	const forcedTier = params.get('quality');
	const deviceHint = params.get('device');
	const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
	const isMobile =
		deviceHint === 'mobile' ||
		(coarsePointer && Math.min(window.innerWidth, window.innerHeight) < 900);
	const cores = navigator.hardwareConcurrency || 0;
	const memory = (navigator as NavigatorWithMemory).deviceMemory || 0;
	const constrained = isMobile && ((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));

	let tier: PerformanceTier;
	if (forcedTier === 'high' || forcedTier === 'balanced' || forcedTier === 'low') {
		tier = forcedTier;
	} else if (constrained) {
		tier = 'low';
	} else if (isMobile) {
		tier = 'balanced';
	} else {
		tier = 'high';
	}

	const resolutionCap = tier === 'low' ? 1.1 : tier === 'balanced' ? 1.5 : 2;

	return {
		tier,
		isMobile,
		reducedEffects: tier === 'low',
		resolution: Math.min(window.devicePixelRatio || 1, resolutionCap),
		antialias: tier === 'high',
		targetFps: tier === 'low' ? 30 : 60,
	};
};

export const performanceProfile = $state(detectProfile());
