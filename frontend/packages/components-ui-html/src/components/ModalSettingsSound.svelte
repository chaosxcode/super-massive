<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getContextEventEmitter } from 'utils-event-emitter';
	import { Button } from 'components-shared';

	import BaseIcon from './BaseIcon.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import type { EmitterEventModal } from '../types';

	type Props = {
		value: number;
		children: Snippet;
	};

	let { value = $bindable(), children }: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();
	const ICONS = { on: 'volumeOn', off: 'volumeOff' } as const;
</script>

<div class="col">
	<span>{@render children()}</span>
	<div class="row">
		<!-- button -->
		<div class="button-wrap">
			<Button
				onclick={() => {
					eventEmitter.broadcast({ type: 'soundPressGeneral' });
					if (value === 0) {
						value = 50;
					} else {
						value = 0;
					}
				}}
			>
				<BaseIcon width="3rem" height="3rem" />
				<BaseButtonContent>
					<span>{value > 0 ? 'ON' : 'OFF'}</span>
				</BaseButtonContent>
			</Button>
		</div>

		<!-- range -->
		<input bind:value type="range" min="0" max="100" class="range gold-range" />

		<!-- value -->
		<div class="value">
			<span>{value}</span>
		</div>
	</div>
</div>

<style lang="scss">
	.col {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		color: #ffd9ad;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.row {
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
	}

	.button-wrap {
		width: 15%;
		display: flex;
		align-items: center;
	}

	.range {
		width: 70%;
		display: flex;
		align-items: center;
	}

	/* gold-themed slider to match the game (no default blue/grey track) */
	.gold-range {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		border-radius: 6px;
		background: linear-gradient(90deg, #ff9440, rgba(255, 148, 64, 0.18));
		outline: none;
		cursor: pointer;
	}
	.gold-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ffd9ad, #f07f2e);
		border: 1px solid #1b1420;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
	}
	.gold-range::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ffd9ad, #f07f2e);
		border: 1px solid #1b1420;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
	}

	.value {
		width: 15%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: #ffd9ad;
		font-weight: 700;
	}
</style>
