import type { PixiPoint, Sizes } from './types';

export const REM = 16;
export const MIN_CLICKABLE_SIZE = 3 * REM; // 44 x 44 is minimum clickable size

export const getPointValues = ({
	point,
	defaultValue,
}: {
	point: PixiPoint;
	defaultValue: number;
}) => {
	const finalDefaultValue = defaultValue === undefined ? 0 : defaultValue;
	if (typeof point === 'number') return [point, point];
	return [point?.x || finalDefaultValue, point?.y || finalDefaultValue];
};

export const anchorToPivot = ({ anchor, sizes }: { anchor: PixiPoint; sizes: Sizes }) => {
	const { width, height } = sizes;
	const [anchorX, anchorY] = getPointValues({ point: anchor, defaultValue: 0 });
	return { x: width * anchorX, y: height * anchorY };
};

/**
 * Detects if WebGL is enabled.
 * Inspired from http://www.browserleaks.com/webgl#howto-detect-webgl
 *
 * @return { number } -1 for not Supported,
 *										0 for disabled
 *										1 for enabled
 */
export function detectWebGL() {
	// Check for the WebGL rendering context
	if (window && !!window.WebGLRenderingContext) {
		let canvas = document.createElement('canvas'),
			names = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'],
			context = false;

		for (const i in names) {
			try {
				// @ts-ignore
				context = canvas.getContext(names[i]);
				// @ts-ignore
				if (context && typeof context.getParameter === 'function') {
					// WebGL is enabled.
					return 1;
				}
			} catch (e) {}
		}

		// WebGL is supported, but disabled.
		return 0;
	}

	// WebGL not supported.
	return -1;
}

// Load the SELF-HOSTED UI font (aliased as 'proxima-nova') before Pixi renders
// any text. Stake forbids external font loads (XSS/CDN policy), so this replaces
// the old typekit WebFont.load — the woff2 ship in the build and are served from
// the Stake CDN. Awaited by InitialiseApplication so there's no flash of fallback.
export const preloadFont = () =>
	new Promise<void>((resolve) => {
		try {
			if (
				typeof document === 'undefined' ||
				!('fonts' in document) ||
				typeof FontFace === 'undefined'
			) {
				resolve();
				return;
			}
			const A =
				(globalThis as unknown as { __ASSET_BASE__?: string }).__ASSET_BASE__ ?? '/assets/';
			const weights = ['400', '600', '700', '800'];
			const loads = weights.map((w) => {
				const ff = new FontFace('proxima-nova', `url(${A}fonts/proxima/poppins-${w}.woff2)`, {
					weight: w,
				});
				return ff
					.load()
					.then((f) => {
						(document as unknown as { fonts: FontFaceSet }).fonts.add(f);
					})
					.catch(() => {});
			});
			// resolve when all are ready, with a safety timeout so init never hangs
			Promise.all(loads).then(() => resolve());
			setTimeout(resolve, 3000);
		} catch {
			resolve();
		}
	});

export function propsSyncEffect<TProps extends object, TTarget>({
	props,
	target,
	ignore,
}: {
	props: TProps;
	target?: TTarget | (() => TTarget);
	ignore?: (keyof TProps)[];
}) {
	$effect(() => {
		// The whole thing is wrapped inside an $effect
		// and because of ”props[key]“，it will react with every single props updated.
		let targetInstance = target instanceof Function ? target() : target;
		if (targetInstance) {
			(Object.keys(props) as (keyof TProps)[])
				.filter((key) => (ignore ? !ignore.includes(key) : true))
				.forEach((key) => {
					if (props[key] !== undefined) {
						// @ts-ignore
						targetInstance[key] = props[key];
					}
				});
		}
	});
}
