<script>
  import { goto } from "$app/navigation";
  import axios from "axios";
  import { onMount } from "svelte";

  let username = '', email = '';
  let newEmail = '', newPwd = '';
  let emailMsg ='', pwdMsg = '';
  let isEmailChange = false, isPwdChange = false;

  onMount(async () => {
    try {
        // Get user's profile information
        const response = await axios.get('http://localhost:3000/profile', {
          withCredentials: true
        });

        if (response.data.success) {
          username = response.data.username;
          email = response.data.email;
        } else {
          console.log('Error occurred when displaying profile.')
        }
    } catch (err) {
        if (err.response && err.response.status === 401) {
            goto('/login'); // Unauthorized
        } else {
            console.error("An error occurred: ", err);
        }
    }
  });

  const updateEmail = async () => {

    try {
        const response = await axios.put('http://localhost:3000/profile/updateEmail', {
        currentEmail: email,
        newEmail,
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true //for including cookies
        });

        if (response.data.success) {
          isEmailChange = response.data.success;
          email = newEmail;
          emailMsg = response.data.message;
          newEmail = '';
          setTimeout(()=>{emailMsg=''}, 3000);
        } else {
          isEmailChange = response.data.success;
          emailMsg = response.data.message;
        }
    } catch(error) {
      console.log("Error occurred when updating email.");
    }

  }

  const updatePwd = async () => {

    try {
      const response = await axios.put("http://localhost:3000/profile/updatePassword", {
        newPwd
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true // for including cookies
      });

      if (response.data.success) {
        isPwdChange = response.data.success;
        pwdMsg = response.data.message;
        newPwd = '';
        setTimeout(()=>{pwdMsg=''}, 3000);
      } else {
        isPwdChange = response.data.success;
        pwdMsg = response.data.message;
      }
    } catch (error) {
      console.log("Error occurred when updating password.")
    }
  }

  
</script>

<div class="page-container">
  <h2>My Profile</h2>
  <!-- RO username -->
  <div class="field-container">
    <label for="username">Username: </label>
    <span>{username}</span><br>
  </div>
  <!-- RO email -->
  <div class="field-container">
    <label for="email">Email:</label>
    <span>{email}</span><br><br>
  </div>
  <!-- Change email -->
  <div class="field-container">
    <label for="email">New Email: </label>
      <input
      type="email"
      id="email"
      placeholder="Enter new email"
      bind:value={newEmail}
      on:focus={() => emailMsg=""}
      />
      <button on:click|preventDefault={updateEmail}>Change email</button>
      {#if emailMsg}
        <span class="errorMsg" style="color: {isEmailChange? 'green' : 'red'}; background-color: {isEmailChange? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{emailMsg}</span>
      {/if}
  </div>
  <br>
 <!-- Change password -->
  <div class="field-container">
      <label for="password">New Password: </label>
      <input
      type="password"
      id="password"
      placeholder="Enter new password"
      bind:value={newPwd}
      on:focus={() => pwdMsg=""}
      />
      <button on:click|preventDefault={updatePwd}>Change password</button>
      {#if pwdMsg}
        <span class="errorMsg" style="color: {isPwdChange? 'green' : 'red'}; background-color: {isPwdChange? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{pwdMsg}</span>
      {/if}
  </div>
</div>

<style>
  .page-container {
    margin-left: 5vw;
  }
  .errorMsg {
    display: block;
    background-color: rgb(255, 193, 193);
    color: red;
    font-size: small;
    min-height: 1rem;
    margin: 5px;
    padding: 5px;
    border-radius: 3px;
  }

  .field-container {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .field-container label {
    min-width: 120px;
    text-align: left;
  }

  .field-container button {
    margin-left: 10px;
  }


</style>