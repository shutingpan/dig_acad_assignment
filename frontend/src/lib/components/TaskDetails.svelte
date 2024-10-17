<script>
  import axios from "axios";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  // For loading task details
  export let task = {};
  export let appName = ""; // Dont actually need this anymore when hv taskid

  // Permissions
  export let taskOpen = false;
  export let taskTodo = false;
  export let taskDoing = false;
  export let taskDone = false;

  // For task actions
  let promoteAction = "", demoteAction = "";
  let newNote = "";

  // For detecting changes
  let plans = [];
  let origPlan = task.task_plan;
  let selectedPlan = task.task_plan;
  let isPlanChanged = false, isNoChange = false;
  $: isPlanChanged = origPlan !== selectedPlan; // detect plan changes
  $: isNoChange = (origPlan === selectedPlan && newNote.trim() === ""); // detect any changes

  // Set task action labels
  switch (task.task_state) {
    case 'Open':
      promoteAction = "Save and Release";
      break;
    case 'Todo':
      promoteAction = "Save and Pick Up";
      break;
    case 'Doing':
      promoteAction = "Save and Seek Approval";
      demoteAction = "Save and Give Up";
      break;
    case 'Done':
      promoteAction = "Save and Approve";
      demoteAction = "Save and Reject";
      break;
    default: console.log("No promote or demote actions.");
  }

  // Get task details
  onMount(async () => {
    try {
      const response = await axios.post('http://localhost:3000/tms/getTask', {
        appName, 
        taskId: task.task_id
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        task = response.data.task;
        plans = response.data.planList;
      }
    } catch (err) {
      console.error("Error occurred:", err);
    }
  });

  function closeModal() {
    dispatch('closetask');
  }

  // Promotable: Open || Todo || Doing || Done
  async function promoteTask() {
    try {
      const response = await axios.post('http://localhost:3000/tms/promoteTask', {
        taskId: task.task_id,
        newNote
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        dispatch('promote-task', response.data); 
      }
    } catch (err) {
      console.error("Error occurred:", err);
    }
  }

  // Demotable: Doing || Done
  async function demoteTask() {
    try {
      const response = await axios.post('http://localhost:3000/tms/demoteTask', {
        taskId: task.task_id,
        newNote,
        selectedPlan
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success){
        dispatch('demote-task', response.data);
      }
    } catch (err) {
      console.error("Error occurred:", err);
    }
  }

  async function saveTask() {
      try {
        const response = await axios.post('http://localhost:3000/tms/updateTask', {
          taskId: task.task_id,
          newNote,
          selectedPlan
        }, {
          headers: {
            "Content-Type": "application/json"
          }, withCredentials: true
        });

        if (response.data.success) {
          dispatch('save-task', response.data);
        }
      } catch (err) {
        console.error("Error occurred: ", err);
      }
  }

</script>

  <div class="modal-overlay" on:click={closeModal} on:keydown={closeModal} role="button" tabindex="0"></div>

  <div class="modal-content">
    <button class="close-button" on:click={closeModal}>x</button>

    <div class="modal-content-section">
          <!-- Task Details -->
          <div class="field-container" >
            <span><strong>Task name:</strong></span>
            <span>{task.task_name}</span>
          </div>

          <div class="field-container">
            <span><strong>ID:</strong></span>
            <span>{task.task_id}</span>
          </div>

          <div class="field-container">
            <span><strong>Plan:</strong></span>

            <!-- Plan can only be changed by owner at Done state -->
            {#if (taskDone && task.task_state === "Done")}
                <select bind:value={selectedPlan}>
                  <option value="" disabled>Select plan (if any)</option>
                  {#each plans as planMVPName}
                      <option value={planMVPName} selected={planMVPName === task.task_plan}>{planMVPName}</option>
                  {/each}
                </select> 
            {:else}
                <span>{task.task_plan}</span>
            {/if}
          </div>

          <div class="field-container">
            <span><strong>State:</strong></span>
            <span>{task.task_state}</span>
          </div>

          <div class="field-container">
            <span><strong>Owner:</strong></span>
            <span>{task.task_owner}</span>
          </div>

          <div class="field-container">
            <span><strong>Creator:</strong></span>
            <span>{task.task_creator}</span>
          </div>

          <div class="field-container">
            <span><strong>Created on</strong></span>
            <span>{task.task_createdate}</span>
          </div>

          <div class="field-container field-textarea">
            <span><strong>Description</strong></span>
            <textarea value={task.task_description} rows="10" cols="35" style="resize: none;" disabled></textarea>
          </div>   

    </div>

    <div class="modal-content-section">
              
          <!-- Notes can only be added by owner at that state -->
          {#if taskOpen && task.task_state === "Open" || taskTodo && task.task_state === "Todo" || taskDoing && task.task_state === "Doing" || taskDone && task.task_state === "Done" }
              <div class="field-container field-textarea">
                <span>Notes</span>
                <textarea placeholder="No notes" rows=15 value={task.task_notes} disabled></textarea>
              </div>

              <div class="field-container field-textarea">
                <span>Add note</span>
                <textarea placeholder="New note" rows=15 bind:value={newNote}></textarea>
              </div>

              <div class="field-container">
                {#if demoteAction}
                  <button class="neg-btn" on:click={demoteTask}>{demoteAction}</button>
                {/if}
                {#if promoteAction}
                  <!-- Disabled if plan changes -->
                  <button class="pos-btn" on:click={promoteTask} disabled={isPlanChanged}>{promoteAction}</button>
                {/if}
                <!-- Disabled if changes not made -->
                <button on:click={saveTask} disabled={isNoChange}>Save Changes</button>
                <button on:click={closeModal}>Cancel</button>
              </div>
          {:else}
          <!-- Read only mode -->
              <div class="field-container field-textarea" style="height: 100%">
                <span>Notes</span>
                <textarea placeholder="No notes" style="height: 100%; resize: none;" value={task.task_notes} disabled></textarea>
              </div>
          {/if}          
    </div>
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
    background-color: #333;
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
  
  /* Disabled button */
  button:disabled, .pos-btn:disabled, .neg-btn:disabled, button:disabled:hover, .pos-btn:disabled:hover, .neg-btn:disabled:hover {
    background-color: #dddddd; 
    color: #a3a3a3; 
    cursor: not-allowed; 
  }

</style>
