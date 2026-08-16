<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import { stateUrlDerived, stateBet, stateConfig, stateModal, stateUi } from 'state-shared';
	import { API_AMOUNT_MULTIPLIER, MOST_USED_BET_INDEXES } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);

	const authenticate = async () => {
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": {
				// 			"socialCasino": false,
				// 			"disabledFullscreen": false,
				// 			"disabledTurbo": false,
				// 			"disabledSuperTurbo": false,
				// 			"disabledAutoplay": false,
				// 			"disabledSlamstop": false,
				// 			"disabledSpacebar": false,
				// 			"disabledBuyFeature": false,
				// 			"displayNetPosition": false,
				// 			"displayRTP": false,
				// 			"displaySessionTimer": false,
				// 			"minimumRoundDuration": 0
				// 	}
				// }
				stateConfig.jurisdiction = authenticateData?.config?.jurisdiction;
				stateConfig.betAmountOptions = (authenticateData.config?.betLevels || []).map(
					(level) => level / API_AMOUNT_MULTIPLIER,
				);

				// MOST_USED_BET_INDEXES is a curated, hardcoded list of ABSOLUTE indexes
				// tuned assuming a specific betAmountOptions length. If this session's
				// betLevels array has a different length, those indexes are not
				// guaranteed to reach the array's true last/highest entry — so make sure
				// the true max always survives as betMenuOptions' final entry (this is
				// what the "MAX" button / bet grid treat as the maximum), regardless of
				// array length.
				const curatedBetMenuOptions = stateConfig.betAmountOptions.filter((_, index) =>
					MOST_USED_BET_INDEXES.includes(index),
				);
				const trueMaxBetAmount =
					stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1];
				stateConfig.betMenuOptions =
					trueMaxBetAmount !== undefined &&
					curatedBetMenuOptions[curatedBetMenuOptions.length - 1] !== trueMaxBetAmount
						? [
								...curatedBetMenuOptions.filter((value) => value !== trueMaxBetAmount),
								trueMaxBetAmount,
							]
						: curatedBetMenuOptions;

				// server-configured default bet level (falls back to whatever
				// stateBet.betAmount already is — e.g. its initial default — when this
				// session's config doesn't include one; round-resume below still runs
				// after this and correctly overrides it for an active round).
				if (authenticateData.config?.defaultBetLevel) {
					const defaultBetAmount = authenticateData.config.defaultBetLevel / API_AMOUNT_MULTIPLIER;
					stateBet.betAmount = defaultBetAmount;
					stateBet.wageredBetAmount = defaultBetAmount;
				}
			}

			// round
			if (authenticateData?.round) {
				// Example of authenticateData.round 
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if(authenticateData.round?.state) {
					// @ts-ignore
					stateBet.betToResume =  authenticateData.round;
				}

				if(authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				};
			}
		} catch (error) {
			console.error(error);
			stateModal.modal = { name: 'error', error };
		}
	};

	const handleReplay = async () => {
		stateBet.betAmount = (stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER) || 0;
		stateBet.wageredBetAmount = (stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER) || 0;
		stateBet.activeBetModeKey = stateUrlDerived.mode();
		// replay URLs carry the currency as a query param (there is no authenticate
		// call in replay mode) — without this, wins render in the default currency
		if (stateUrlDerived.currency()) stateBet.currency = stateUrlDerived.currency();

		const data = await requestReplay({
			rgsUrl: stateUrlDerived.rgsUrl(),
			game: stateUrlDerived.game(),
			mode: stateUrlDerived.mode(),
			version: stateUrlDerived.version(),
			event: stateUrlDerived.event(),
		});

		if(data) {
			// @ts-ignore
			stateBet.betToResume = {
				...data,
				event: '0',
				active: true,
				mode: stateUrlDerived.mode(),
			};
		}
	};

	onMount(async () => {
		// local dev: ?mock=true runs standalone with a fake RGS (no session/network).
		// Lets you open the UI + bonus menu + see the wave. (Real spins/bets still need RGS.)
		if (stateUrlDerived.mock()) {
			stateUi.config.mode = 'default';
			stateBet.currency = 'XGC';
			stateBet.balanceAmount = 100000;
			stateBet.betAmount = stateConfig.betAmountOptions[0] ?? 1;
			stateConfig.jurisdiction = { ...stateConfig.jurisdiction, socialCasino: true };
			authenticated = true;
			return;
		}

		if(stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			await handleReplay();
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		};

		authenticated = true;
	});
</script>

{#if authenticated}
	{@render props.children()}
{/if}
