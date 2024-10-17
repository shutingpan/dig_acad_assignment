<script>
  import axios from "axios";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  
  // For plan details
  export let appName = "";
  let plans = [];

  // For creating plan
  let isPM = false, createMsg = '', isCreated = '';
  let newPlan = {
    plan_mvp_name: '',
    plan_startdate: '',
    plan_enddate: '',
    plan_colour: '#ffffff'
  }

  onMount( async () => {
    try {
      const response = await axios.post(`http://localhost:3000/tms/app/plans`, {
        appName
      },{
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        plans = response.data.plans;
        isPM = response.data.isPM;
      } else {
        console.log("Error occurred when fetching plan list.");
      }
    } catch (err) {
        console.error("Error occurred: ", err);
    }
  });
 
  async function createPlan() {
    const response = await axios.post("http://localhost:3000/tms/app/createPlan", {
      appName,
      newPlan
    }, {
      headers: {
        'Content-Type': 'application/json'
      }, withCredentials: true
    });

    if (response.data.success) {
      // Notification
      isCreated = response.data.success;
      createMsg = response.data.message;
      setTimeout(() => {createMsg=""}, 3000);
      // Add new entry in plans (table and taskboard)
      plans = [{...newPlan}, ...plans];
      dispatch('create-plan', newPlan);
      // Reset inputs
      newPlan.plan_mvp_name = ''; 
      newPlan.plan_startdate = ''; 
      newPlan.plan_enddate = '';
      newPlan.plan_colour = '#ffffff';
    } else {
      isCreated = response.data.success;
      createMsg = response.data.message;
      setTimeout(() => {createMsg=""}, 3000);
    }
  }

  function closeModal() {
    dispatch('closeplan');
  }
</script>

  <div class="modal-overlay" on:click={closeModal} on:keydown={closeModal} role="button" tabindex="0"></div>

  <div class="modal-content">
    <button class="close-button" on:click={closeModal}>x</button>
    <h2>Plans</h2>

     <!-- Create Plan Notification -->
    {#if createMsg}
      <span class="errorMsg" style="color: {isCreated? 'green': 'red'}; background-color: {isCreated? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{createMsg}</span>
    {/if}

    <form on:submit|preventDefault={createPlan}>
      <table>
        <thead>
          <tr>
            <th>Plan MVP Name</th>
            <th>Start date</th>
            <th>End date</th>
            <th>Colour</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#if isPM}
            <!-- Create Plan -->
            <tr>
              <!-- Plan MVP Name -->
              <td>
                <input type="text" maxlength="50" bind:value={newPlan.plan_mvp_name} required >
              </td>
              <!-- Start date -->
              <td>
                <input type="date" max="9999-12-31" bind:value={newPlan.plan_startdate} required>
              </td>
              <!-- End date -->
              <td>
                <input type="date" max="9999-12-31" bind:value={newPlan.plan_enddate} required>
              </td>
              <!-- Colour -->
              <td>
                <input type="color" bind:value={newPlan.plan_colour} required>
              </td>
              <td>
                <button type="submit">Create</button>
              </td>
            </tr>
          {/if}
          <!-- View Plans -->
          {#each plans as plan}
            <tr>
              <td>{plan.plan_mvp_name}</td>
              <td>
                <input type="date" value={plan.plan_startdate} disabled>
              </td>
              <td>
                <input type="date" value={plan.plan_enddate} disabled>
              </td>
              <td>
                <input type="color" value={plan.plan_colour} disabled>
              </td>
              <td></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </form>
    


  </div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5); 
    z-index: 1000; /* on top of other content */
  }

  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70vw;
    height: 70vh;
    overflow-y: auto; /* Enable vertical scrolling inside modal */
    padding: 15px;
    border-radius: 5px;
    background-color: rgb(255, 255, 255);
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1001; /* above overlay */
  }

  .close-button {
    position: absolute;
    top: 10px;
    right: 15px;
    cursor: pointer;
    background: none;
    border: none;
    font-size: 22px;
  }

  table {
    width: 100%;
    border-collapse: collapse;

  }

  table th, table td {
    border: 1px solid #ddd;
    padding: 5px;
    text-align: left;
  }

  table th {
    background-color: #f2f2f2;
  }

  table tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  table tr:hover {
    background-color: #ddd;
  }
  
  .errorMsg {
    display: block;
    background-color: rgb(255, 193, 193);
    color: red;
    font-size: small;
    min-height: 1rem;
    margin: 5px 0px;
    padding: 5px;
    border-radius: 3px;
  }
</style>
