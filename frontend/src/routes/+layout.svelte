<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Navbar from "$lib/components/Navbar.svelte";
  import { onMount } from "svelte";  

  let displayNavbar = false;
  let loading = true;

  // Navbar not displayed on login page
  $: displayNavbar = ($page.url.pathname !== '/login'); 

  onMount(() => {
      if ($page.url.pathname === '/') {
          goto('/login').then(() => {
            loading = false; // hide loading screen after redirect
          });
      } else {
        loading = false; // hide loading screen if not redirecting
      }
  });
</script>

{#if loading}
  <div>Loading...</div>
{:else}

  {#if displayNavbar}
    <Navbar />
  {/if}
        
  <!-- Dynamic: shows +page.svelte in same lvl and inner folders  -->
  <div class="container">
    <slot />
  </div>

{/if}


<style>
  .container {
        margin: 10px;
        min-height: 100vh;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
</style>

