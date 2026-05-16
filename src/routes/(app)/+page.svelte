<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { isAuthenticated } from '$lib/stores/auth';


  onMount(() => {
    goto('/login');
  });
</script>