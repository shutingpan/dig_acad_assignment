<script>
  import { goto } from "$app/navigation";
  import axios from "axios";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  // Import info
  export let appName = "";

  // For task details
  export let newTask = {
    task_name: "",
    task_description: "",
    task_notes: "",
    task_plan: "",
    task_app_acronym: appName,
    task_state: "-",
    task_creator: "Me",
    task_owner: "Me",
  };

  let plans = [];
  let errMsg = ""; 

  // Populate plans dropdown
  onMount(async () => {
    try {
      const response = await axios.post(`http://localhost:3000/tms/app/plans`, {
        appName
      } ,{
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        plans = response.data.plans;
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
          goto('/login'); // Unauthorized 
      } else {
          console.error("An error occurred: ", err);
      }
    }
  });

  // Discard & exit
  function closeModal() {
    dispatch('closetask');
  }

  // Create task & return to taskboard
  async function createTask() {
    try {
      const response = await axios.post('http://localhost:3000/tms/app/createTask', {
        newTask
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        dispatch('createtask', response.data);
      } else {
        errMsg = response.data.message;
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
          goto('/login'); // Unauthorized 
      } else {
          console.error("An error occurred: ", err);
      }
    }
  }

</script>

  <div class="modal-overlay" on:click={closeModal} on:keydown={closeModal} role="button" tabindex="0"></div>

  <form on:submit|preventDefault={createTask}>
    <div class="modal-content">
      <button class="close-button" type="button" on:click={closeModal}>x</button>

        <div class="modal-content-section">
          <!-- Create Task -->
            <div class="field-container" >
              <span><strong>Task name:</strong></span>
              <input type="text" bind:value={newTask.task_name} required on:focus={()=> errMsg=""}/> 
            </div>

            <!-- Error msgs -->
            {#if errMsg}
              <span class="errorMsg">{errMsg}</span>
            {/if}
    
            <div class="field-container">
              <span><strong>App Acronym:</strong></span>
              <span>{newTask.task_app_acronym}</span>
            </div>
            
            <div class="field-container">
              <span><strong>Plan:</strong></span>
              <select bind:value={newTask.task_plan}>
                <option value="" selected>No plan</option>
                {#each plans as plan}
                  <option value={plan.plan_mvp_name}>{plan.plan_mvp_name}</option>
                {/each}
              </select> 
            </div>
    
            <div class="field-container">
              <span><strong>State:</strong></span>
              <span>{newTask.task_state}</span>
            </div>
    
            <div class="field-container">
              <span><strong>Owner:</strong></span>
              <span>{newTask.task_owner}</span>
            </div>
    
            <div class="field-container">
              <span><strong>Creator:</strong></span>
              <span>{newTask.task_creator}</span>
            </div>
    
            <div class="field-container field-textarea">
              <span><strong>Description</strong></span>
              <textarea bind:value={newTask.task_description} maxlength="255" rows="10" style="resize: none;"></textarea>
            </div>                
        </div>
    
        <div class="modal-content-section"> 
    
          <div class="field-container field-textarea">
            <span>Notes</span>
            <textarea placeholder="No notes" rows="5" style="resize: none;" disabled></textarea>
          </div>
    
          <div class="field-container field-textarea">
            <span>Add note</span>
            <textarea placeholder="New note" rows="19" bind:value={newTask.task_notes}></textarea>
          </div>

          <div class="field-container">
            <button type="submit" class="pos-btn">Create Task</button>
            <button type="button" on:click={closeModal} class="neg-btn">Cancel</button>
          </div>        
        </div>
      </div>
  </form>

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

  .modal-content * {
  box-sizing: border-box;
  }

  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 85vw;
    height: 90vh; 
    overflow-y: auto; /* Enable vertical scrolling inside modal */
    padding: 15px;
    border-radius: 5px;
    background-color: rgb(255, 255, 255);
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1001; /* above overlay */
    display: flex;
    justify-content: space-between;
  }

  .close-button {
    position: absolute;
    top: 5px;
    right: 10px;
    cursor: pointer;
    background: none;
    border: none;
    font-size: 22px;
    color: black;
  }

  .modal-content-section {
    background-color: rgb(255, 255, 255);
    margin: 3px;
    padding: 15px;
    display: flex;
    flex-direction: column;
  }

  .modal-content-section:first-child {
    flex-basis: 30%;
  }

  .modal-content-section:last-child {
    flex-basis: 70%;
  }

  .field-container {
    display: flex;
    align-items: center;
    margin: 10px 0px;
  }

  .field-textarea {
    display: flex;
    flex-direction: column;
    align-items: flex-start; /* align to the left */
   }

  .field-textarea textarea {
    width: 100%; 
    margin-top: 10px; /* Add some space between the label and the textarea */
  }

  strong {
    display: inline-block;
    min-width: 120px;
  }

  textarea {
    resize: vertical;
  }

  button {
    color: white;
    border: none;
    padding: 10px 10px;
    cursor: pointer;
    border-radius: 3px;
    margin: 3px;
  }

  .pos-btn {
    background-color: green;
  }

  .pos-btn:hover {
    background-color: darkgreen; 
  }

  .neg-btn {
    background-color: red; 
  }

  .neg-btn:hover {
    background-color: darkred; 
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
