<script> 
  import { goto } from "$app/navigation";
  import AppDetails from "$lib/components/AppDetails.svelte";
  import PlanDetails from "$lib/components/PlanDetails.svelte";
  import TaskCard from "$lib/components/TaskCard.svelte";
  import TaskCreate from "$lib/components/TaskCreate.svelte";
  import TaskDetails from "$lib/components/TaskDetails.svelte";
  import axios from "axios";
  import { onMount } from "svelte";

  // For app information
  const appName = localStorage.getItem("appName");

  // For viewing existing task
  let selectedTask = {};
  // For colour coding based on plan-colour pairs
  let planColours = {};
  // For viewing modals
  let activeModal = "";
  // For task action permissions
  let taskCreate = false, taskOpen = false, taskTodo = false, taskDoing = false, taskDone = false;
  // For task columns 
  let openTasks = [];
  let todoTasks = [];
  let doingTasks = [];
  let doneTasks = [];
  let closedTasks = [];
  // For notification
  let isSuccess = false, notifMsg = "";

  onMount(async () => {
    try {
      const response = await axios.post('http://localhost:3000/tms/app/taskboard', {
        appName
      }, {
        headers: {
          "Content-Type": "application/json"
        }, withCredentials: true
      });

      if (response.data.success) {
        // User permissions
        taskCreate = response.data.permits.taskCreate;
        taskOpen = response.data.permits.taskOpen;
        taskTodo = response.data.permits.taskTodo;
        taskDoing = response.data.permits.taskDoing;
        taskDone = response.data.permits.taskDone;

        // Taskboard data - plan colours & task columns
        planColours = response.data.planColPairs;
        openTasks = response.data.openTasks;
        todoTasks = response.data.todoTasks;
        doingTasks = response.data.doingTasks;
        doneTasks = response.data.doneTasks;
        closedTasks = response.data.closedTasks;
      } 
    } catch (err) {
      if (err.response && err.response.status === 401) {
          goto('/login'); // Unauthorized 
      } else {
          console.error("An error occurred: ", err);
      }
    }
  });

  function promoteTask(event) {
    closeModal();
    const  promotedTask = event.detail.promotedTask;

    // Notification 
    isSuccess = event.detail.success
    notifMsg = event.detail.message;
    setTimeout(()=> {notifMsg=""}, 4000);

    // Update task columns
    switch (promotedTask.task_state) {
      case 'Todo':
        openTasks = openTasks.filter(openTask => openTask.task_id !== promotedTask.task_id); //remove
        todoTasks = [promotedTask, ...todoTasks]; //promote
        break;
      case 'Doing':
        todoTasks = todoTasks.filter(todoTask => todoTask.task_id !== promotedTask.task_id); //remove
        doingTasks = [promotedTask, ...doingTasks]; //promote
        break;
      case 'Done':
        doingTasks = doingTasks.filter(doingTask => doingTask.task_id !== promotedTask.task_id); //remove
        doneTasks = [promotedTask, ...doneTasks]; //promote
        break;
      case 'Closed':
        doneTasks = doneTasks.filter(doneTask => doneTask.task_id !== promotedTask.task_id); //remove
        closedTasks = [promotedTask, ...closedTasks]; //promote
        break;
      default: console.log("Task is not promotable.");
    }
  }

  function demoteTask(event) {
    closeModal();
    const demotedTask = event.detail.demotedTask;

    // Notification 
    isSuccess = event.detail.success
    notifMsg = event.detail.message;
    setTimeout(()=> {notifMsg=""}, 4000);

    // Update task columns
    switch(demotedTask.task_state) {
      case 'Todo':
        doingTasks = doingTasks.filter(doingTask => doingTask.task_id !== demotedTask.task_id); // remove
        todoTasks = [demotedTask, ...todoTasks]; // demote
        break;

      case 'Doing':
        doneTasks = doneTasks.filter(doneTask => doneTask.task_id !== demotedTask.task_id); // remove
        doingTasks = [demotedTask, ...doingTasks]; // demote
        break;
      default: console.log("This task is not demotable.");
    }
  }

  function openModal(modal) {
    activeModal = modal;
  }
  function closeModal() {
    activeModal= "";
  }
  function viewTask(task) {
    selectedTask = task;
    openModal('task');
  }

  function createPlan(event) {
    // Add new entry to plan-colour pairs
    planColours[event.detail.plan_mvp_name] = event.detail.plan_colour;
  }

  function createTask(event) {
    // Update open column with new task
    openTasks = [event.detail.createdTask, ...openTasks];
  }

  function saveTask(event) {
    // Replace old task with updated task
    const updatedTask = event.detail.updatedTask;
    switch (updatedTask.task_state) {
      case "Open": 
        openTasks = openTasks.filter(t => t.task_id !== updatedTask.task_id); // remove 
        openTasks = [updatedTask, ...openTasks]; // update
        break;
      case "Todo":
        todoTasks = todoTasks.filter(t => t.task_id !== updatedTask.task_id); // remove 
        todoTasks = [updatedTask, ...todoTasks]; // update 
        break;
      case "Doing":
        doingTasks = doingTasks.filter(t => t.task_id !== updatedTask.task_id); // remove 
        doingTasks = [updatedTask, ...doingTasks]; // update 
        break;
      case "Done": 
        doneTasks = doneTasks.filter(t => t.task_id !== updatedTask.task_id); // remove 
        doneTasks = [updatedTask, ...doneTasks]; // update
        break;
    }
  }

</script>

<!-- Notification -->
{#if notifMsg}
    <span class="errorMsg notification" style="color: {isSuccess? 'green': 'red'}; background-color: {isSuccess? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{notifMsg}</span>
{/if}

<!-- Header Section -->
<div class="header">
  <div class="app-info">
    <h2>{appName}</h2>
    <button class="view-app-btn" on:click={()=> openModal('app')}>View App Details</button>
  </div>
  
  <div class="button-group">
    {#if taskCreate}
      <button on:click={() => openModal('newTask')}>Create Task</button>
    {/if}
    <button on:click={() => openModal('plan')}>Plans</button>
  </div>
</div>

<div class="taskboard">
  <!-- Open Tasks -->
  <div class="task-column">
    <p>Open</p>
    {#each openTasks as task}
        <TaskCard task={task} onViewTask={viewTask} colour={planColours[task.task_plan] || "#FFFFFF"} />
    {/each}
  </div>
  <!-- To-Do Tasks -->
  <div class="task-column">
    <p>Todo</p>
    {#each todoTasks as task}
      <TaskCard task={task} onViewTask={viewTask} colour={planColours[task.task_plan] || "#FFFFFF"}/>
    {/each}
  </div>
  <!-- Doing Tasks -->
  <div class="task-column">
    <p>Doing</p>
    {#each doingTasks as task}
      <TaskCard task={task} onViewTask={viewTask} colour={planColours[task.task_plan] || "#FFFFFF"} />
    {/each}
  </div>
  <!-- Done Tasks -->
  <div class="task-column">
    <p>Done</p>
    {#each doneTasks as task}
      <TaskCard task={task} onViewTask={viewTask} colour={planColours[task.task_plan] || "#FFFFFF"}/>
    {/each}
  </div>
  <!-- Closed Tasks -->
  <div class="task-column">
    <p>Closed</p>
    {#each closedTasks as task}
      <TaskCard task={task} onViewTask={viewTask} colour={planColours[task.task_plan] || "#FFFFFF"}/>
    {/each}
  </div>
</div>

<!-- View a task -->
{#if activeModal === 'task'}
  <TaskDetails appName={appName} 
  task={selectedTask} 
  on:closetask={closeModal} 
  on:promote-task={promoteTask} 
  on:demote-task={demoteTask}
  on:save-task={saveTask}
  taskOpen={taskOpen} 
  taskTodo={taskTodo} 
  taskDoing={taskDoing} 
  taskDone={taskDone}/>
{/if}

<!-- View App Details -->
{#if activeModal === 'app'}
  <AppDetails appName={appName} on:closeapp={closeModal}/>
{/if}

<!-- View Plans -->
{#if activeModal === 'plan'}
  <PlanDetails appName={appName} on:closeplan={closeModal} on:create-plan={createPlan}/>
{/if}

<!-- Create Task -->
{#if activeModal === 'newTask'}
  <TaskCreate appName={appName} on:closetask={closeModal} on:createtask={createTask}/>
{/if}

<style>
  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 10px 0;
    border-bottom: 1px solid #ddd;
  }

  .app-info {
    display: flex;
    flex-direction: column; 
    /* flex-direction: center; */
  }

  .app-info h2 {
    margin: 0 12px 0 0;
    font-size: 28px;
  }

  .view-app-btn {
    margin: 10px 0px;
    padding: 0px;
    font-size: 15px;
    color: #333;
    border: none;
    background: none;
    text-align: left;
    text-decoration: underline;
    cursor: pointer;
  }

  .button-group {
    display: flex;
    gap: 10px;
  }

  .button-group button {
    padding: 10px 20px;
    font-size: 16px;
    border: none;
    background-color: #333;
    color: white;
    cursor: pointer;
    border-radius: 5px;
  }

  .button-group button:hover {
    background-color: #555;
  }

  /* Taskboard */
 .taskboard {
  display: flex;
  justify-content: space-between;
  width: 100%;
 }

 .task-column {
  border-radius: 5px;
  margin: 5px;
  padding: 10px;
  width: 20%;
  height: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
 }

 .task-column p {
  text-align: center;
  font-size: 20px;
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
      top: 70px;
      right: 50%; 
      padding: 10px;
      border-radius: 3px;
      z-index: 1000; 
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

</style>