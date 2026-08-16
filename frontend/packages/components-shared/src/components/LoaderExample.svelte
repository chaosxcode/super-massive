<script lang="ts">
	import LoaderBase from './LoaderBase.svelte';

	type Props = {
		src: string;
	};

	const props: Props = $props();
</script>

<LoaderBase maxWidth={520} backgroundColor={'#000000'} timeout={2000} src={props.src} />
