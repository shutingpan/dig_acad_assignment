<script>
  export let task;
  export let onViewTask; // Callback for viewing task
  export let colour = "#ffffff"
</script>

<div class="taskcard" on:click={onViewTask(task)} on:keydown|preventDefault role="button" tabindex="0" style="border-left: 4px solid {colour};">
  <span class="taskid">ID: {task.task_id}</span>
  <h3>{task.task_name}</h3>
  <span class="taskowner">Owned by {task.task_owner}</span>
</div>

<style>
  .taskcard {
    margin: 5px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .taskcard:hover {
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .taskid, .taskowner {
    color: rgb(90, 90, 90);
  }

  h3 {
    margin: 8px 0px;
  }
</style>
