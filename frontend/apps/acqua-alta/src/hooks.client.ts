// Standalone-local-play accommodation (app-level only, see NOTES.md):
// the shared rgs-fetcher hard-codes `https://${rgs_url}${path}` for every RGS
// call, but a local mock RGS (launched with ?rgs_url=localhost:8765, or a LAN
// IP like 10.0.0.101:8765 for phone testing) speaks plain http. Rewrite
// https -> http for localhost/127.0.0.1 AND private LAN IPs only —
// a no-op for any real (public) RGS host.
// (trilinear-mipmap default for crisp minified art is set in pixi-svelte's
//  InitialiseApplication — pixi.js can't be imported from a SvelteKit hooks file.)

const LOCALHOST_HTTPS =
	/^https:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?=[:/])/;

const nativeFetch = window.fetch.bind(window);

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

	if (LOCALHOST_HTTPS.test(url)) {
		const rewritten = url.replace(LOCALHOST_HTTPS, 'http://$1');
		return input instanceof Request
			? nativeFetch(new Request(rewritten, input), init)
			: nativeFetch(rewritten, init);
	}

	return nativeFetch(input as RequestInfo, init);
}) as typeof fetch;

// Stake serves the game at .../index.html; the SvelteKit client router has no
// route for that literal path and logs a cosmetic "Not found: /index.html"
// console.error on boot (the prerendered page renders fine). "Clean console"
// is a Stake review item, so swallow exactly that known 404 — anything else
// still logs.
export const handleError = ({ error }: { error: unknown }) => {
	const message = error instanceof Error ? error.message : String(error);
	if (/Not found: .*index\.html/.test(message)) return { message };
	console.error(error);
	return { message };
};
