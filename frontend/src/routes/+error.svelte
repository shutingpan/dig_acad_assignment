<!-- Renders when errors occur -->
<!-- Svelte will look for +error.svelte in route folder then go up the hierarchy if not found -->
<script>
	import { page } from '$app/stores';
</script>

<h1>{$page.status}: {$page.error?.message}</h1>