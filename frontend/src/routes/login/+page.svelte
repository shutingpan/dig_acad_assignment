<script>
  import axios from 'axios';
  import { goto } from '$app/navigation';
  let username = '';
  let password = '';
  let error = '';

  axios.defaults.withCredentials=true;

  // Function to handle login form submission
  const handleLogin = async () => {

    try {
      const response = await axios.post('http://localhost:3000/login', {
        username: username,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true // for including cookies
      });
      
      if (response.data.success) {
        console.log("Successful login: ", response.data);
        goto("/tms");
      } else {
        console.log("Unsuccessful login: ", response.data);
        error = response.data.message || "Invalid username or password.";
      }

    } catch (err) {
      console.log('Error occurred.');
      error = 'An error occurred while logging in.';
    }
  };
</script>

<main>
  <div class="login-container">
    <form on:submit|preventDefault={handleLogin}>

      <div class="form-group">
        <label for="username">Username</label>
        <input
          type="text"
          id="username"
          bind:value={username}
          placeholder="Enter username"
          required/>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter password"
          required/>
      </div>

      {#if error}
        <p class="error-message">{error}</p>
      {/if}

      <button type="submit" class="login-btn">Log in</button>
    </form>
  </div>
</main>

<style>
  * { 
    box-sizing: border-box;
  }
  
  .login-container {
    width: 300px;
    margin: 100px auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 5px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .login-btn {
    width: 100%;
    padding: 10px;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .login-btn:hover {
    background-color: #555;
  }

  .error-message {
    color: red;
    margin-bottom: 10px;
  }
</style>

