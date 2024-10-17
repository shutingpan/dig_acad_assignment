<script>
  import axios from "axios";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();

  // For viewing app information
  export let appName = "";
  let app = {
        app_acronym: '',
        app_rnumber: 0,
        app_startdate: '',
        app_enddate: '',
        app_permit_create: '',
        app_permit_open: '',
        app_permit_todolist: '',
        app_permit_doing: '',
        app_permit_done: '',
        app_description: ''
    };

  // Display app information
  onMount( async () => {
    try {
      const response = await axios.post('http://localhost:3000/tms/app', {
        appName
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        app = response.data.app;
      } else {
        console.log("Error occurred when fetching app information.");
      }
    } catch (err) {
        console.error("Error occurred: ", err);
    }
  });
 
  function closeModal() {
    dispatch('closeapp');
  }
</script>

  <div class="modal-overlay" on:click={closeModal} on:keydown={closeModal} role="button" tabindex="0"></div>

  <div class="modal-content">
    <button class="close-button" on:click={closeModal}>x</button>

    <div class="modal-content-section">
      <div>
        <p><strong>App Acronym:</strong> {app.app_acronym}</p>
        <p><strong>Start date:</strong> {app.app_startdate}</p>
        <p><strong>End date:</strong> {app.app_enddate}</p>
        <br>
        <p><strong>Task Permissions</strong></p>
        <p><strong>Create:</strong> {app.app_permit_create}</p>
        <p><strong>Open:</strong> {app.app_permit_open}</p>
        <p><strong>To do:</strong> {app.app_permit_todolist}</p>
        <p><strong>Doing:</strong> {app.app_permit_doing}</p>
        <p><strong>Done:</strong> {app.app_permit_done}</p>
      </div>
    </div>

    <div class="modal-content-section">         
        <div class="field-textarea">
          <p><strong>Description</strong></p>
          <textarea value={app.app_description} rows="10" cols="35" style="resize: none;" disabled></textarea>
        </div>
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

  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70vw;
    height: 60vh;
    overflow-y: auto; /* Enable vertical scrolling inside modal */
    padding: 15px;
    border-radius: 5px;
    background-color: rgb(255, 255, 255);
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1001; /* above overlay */
    display: flex;
    justify-content:space-evenly;
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

  .modal-content-section {
    background-color: rgb(255, 255, 255);
    margin: 3px;
  }

  .modal-content-section:first-child {
    flex-basis: 40%;
  }

  .modal-content-section:last-child {
    flex-basis: 60%;
  }

  .field-textarea {
    display: flex;
    flex-direction: column;
   }

  .field-textarea textarea {
    width: 100%; 
    margin-top: 10px; /* Add some space between the label and the textarea */
  }

  strong {
    display: inline-block;
    min-width: 115px;
  }
  
</style>
