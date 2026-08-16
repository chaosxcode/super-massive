<script lang="ts" module>
	import { stateBet, stateBetDerived, stateModal } from 'state-shared';
</script>

<script lang="ts">
	import OnHotkey from './OnHotkey.svelte';

	const spaceHoldOn = () => {
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = true;
		stateBetDerived.updateIsTurbo(true, { persistent: true });
	};

	const spaceHoldOff = () => {
		stateBet.isSpaceHold = false;
		stateBetDerived.updateIsTurbo(false, { persistent: true });
	};
</script>

<!-- space-hold must not arm continuous play while a menu/modal is open -->
<OnHotkey
	hotkey="Space"
	disabled={stateModal.modal !== null}
	onhold={spaceHoldOn}
	onholdend={spaceHoldOff}
/>
