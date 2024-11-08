<script lang="ts">
  import { goto } from "$app/navigation";
  import axios from "axios";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  // For loading task details
  export let task = {
    task_id: "",
    task_name: "",
    task_plan: "",
    task_state: "",
    task_owner: "",
    task_creator: "",
    task_createdate: "",
    task_description: "",
    task_notes: "",
    task_app_acronym: ""
  };

  // Permissions
  export let taskOpen = false;
  export let taskTodo = false;
  export let taskDoing = false;
  export let taskDone = false;

  // For task actions
  let promoteAction = "", demoteAction = "";
  let newNote = "";
  let errMsg = "", isSuccess = false;

  // For detecting changes
  let plans: string[] = [];
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
  }

  // Get task details
  onMount(async () => {
    try {
      const response = await axios.post('http://localhost:3000/tms/app/task', {
        taskId: task.task_id
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        plans = response.data.planList;
      }
    } catch (err : any) {
      handleError(err);
    }
  });

  function closeModal() {
    dispatch('closetask');
  }

  // Promotable: Open || Todo || Doing || Done
  async function promoteTask() {
    try {
      const response = await axios.post('http://localhost:3000/tms/app/promoteTask', {
        task_id: task.task_id,
        taskState: task.task_state,
        newNote,
        selectedPlan
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        dispatch('promote-task', response.data); 
      } else {
        errMsg = response.data.message;
        setTimeout(()=> {errMsg=""}, 4000);
      }
    } catch (err : any) {
      handleError(err);
    }
  }

  // Demotable: Doing || Done
  async function demoteTask() {
    try {
      const response = await axios.post('http://localhost:3000/tms/app/demoteTask', {
        task_id: task.task_id,
        taskState: task.task_state,
        newNote,
        selectedPlan
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success){
        dispatch('demote-task', response.data);
      } else {
        errMsg = response.data.message;
        setTimeout(()=> {errMsg=""}, 4000);
      }
    } catch (err : any) {
      handleError(err);
    }
  }

  async function saveTask() {
      try {
        const response = await axios.post('http://localhost:3000/tms/app/updateTask', {
          task_id: task.task_id,
          taskState: task.task_state,
          newNote,
          selectedPlan
        }, {
          headers: {
            "Content-Type": "application/json"
          }, withCredentials: true
        });

        if (response.data.success) {
          // Notification
          errMsg = response.data.message;
          isSuccess = response.data.success;
          setTimeout(()=> {errMsg=""; isSuccess = false;}, 4000);
          // Update task
          task = response.data.updatedTask;
          // Reset to saved changes
          origPlan = response.data.updatedTask.task_plan;
          selectedPlan = response.data.updatedTask.task_plan;
          newNote = "";
          dispatch('save-task', response.data);
        } else {
          errMsg = response.data.message;
          setTimeout(()=> {errMsg=""}, 4000);
        }
      } catch (err : any) {
        handleError(err);
      }
  }

  function handleError(err : any) {
    if (err.response && err.response.status === 401) {
      goto('/login'); // Unauthorized 
    } else if (err.response && err.response.status === 409) {
      errMsg = err.response.data.message; // Conflict in task state
      setTimeout(()=> {errMsg=""}, 4000);
      dispatch('reload-taskboard'); 
    } else if ( err.response && ( err.response.status === 403 || err.response.status === 500 )) {
      errMsg = err.response.data.message; // Forbidden (not permitted) / Unexpected 
      setTimeout(()=> {errMsg=""}, 4000);
    } else {
      console.error("An error occurred: ", err);
    }
  }

</script>

  <div class="modal-overlay" on:click={closeModal} on:keydown|preventDefault role="button" tabindex="0"></div>

  <div class="modal-content">
    <button class="close-button" on:click={closeModal}>x</button>

    <!-- Error Notification -->
    {#if errMsg}
      <span class= "errorMsg notification" style="color: {isSuccess? 'green': 'red'}; background-color: {isSuccess? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{errMsg}</span>
    {/if}

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

            <!-- Plan can only be changed by owner at Open and Done state -->
            {#if (taskOpen && task.task_state === "Open" || taskDone && task.task_state === "Done")}
                <select bind:value={selectedPlan}>
                  <option value="">No plan</option>
                  {#each plans as planMVPName}
                      <option value={planMVPName}>{planMVPName}</option>
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
            <pre>{task.task_description}</pre>
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
                  <!-- Disabled if plan changes at Done state but not at Open state-->
                  <button class="pos-btn" on:click={promoteTask} disabled={isPlanChanged && task.task_state !== "Open"}>{promoteAction}</button>
                {/if}
                <!-- Disabled if changes not made (any state) or if plan changes at Done state -->
                <button on:click={saveTask} disabled={isNoChange || isPlanChanged && task.task_state === "Done"}>Save Changes</button>
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

  pre {
    white-space: pre-wrap; /* enable line wrapping */
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

  .errorMsg {
      display: block;
      background-color: rgb(255, 193, 193);
      color: red;
      font-size: medium;
      min-height: 1rem;
      margin: 5px 0px;
      padding: 5px;
      border-radius: 3px;
  }

  .notification {
      position: fixed;
      top: 0px;
      left: 25%; 
      width: 50%;
      text-align: center;
      z-index: 1000; 
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

</style>
