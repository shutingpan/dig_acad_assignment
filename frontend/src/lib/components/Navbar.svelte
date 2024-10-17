
<script>
  import { goto } from "$app/navigation";
  import axios from "axios";
  import { onMount } from "svelte";

  export let isAdminUser = false;

  onMount(async () => {
    try {
      const response = await axios.get('http://localhost:3000/isAdmin', {
        withCredentials: true
      });

      if (response.data.isAdmin) {
        isAdminUser = response.data.isAdmin;
        console.log("User is an admin. Navbar shows ums...");
      } else {
        isAdminUser = response.data.isAdmin;
        console.log("User is not an admin. Navbar hiding ums...");
      }
    } catch (err) {
      console.error("Failed to check group:", err);
    }
  });

  const handleLogout = async () => {
    try {
      const response = await axios.post('http://localhost:3000/logout', {}, { withCredentials : true });
      if (response.data.success) {
        goto("/login");
      }
    } catch (err) {
      console.log('Error occurred when logging out.');
    }
  };
</script>



  <nav class="navbar">
    <div class="tms-ums">
      <a href="/tms">Task Management</a>

      {#if isAdminUser}
      <a href="/user-management">User Management</a>
      {/if}
    </div>
    <div class="user-profile">
      <a href="/profile">Profile</a>
      <!-- To link to backend -->
      <a href="/logout" on:click|preventDefault={handleLogout}>Logout</a>
    </div>
  </nav>


  <style>
    .navbar {
      display: flex;
      justify-content: space-between;
      background-color: #1f1f1f;
    }

    div {
      display: flex;
    }
  
    .navbar a {
      display: block;
      color: rgb(255, 255, 255);
      padding: 1rem 2rem;
      text-decoration: none;
    }
  
    .navbar a:hover {
      text-decoration: none;
      background-color: rgb(226, 226, 226);
      color: #1f1f1f;
    }



    /* For screens smaller than 768px */
  @media (max-width: 768px) {
    .navbar {
      flex-direction: column; /* Stack links vertically */
    }

    .tms-ums, .user-profile {
      flex-direction: column; /* Stack links vertically */
      width: 100%;            /* Each link spans full width */
    }

    .navbar a {
      text-align: center;
    }
  }
  </style>
