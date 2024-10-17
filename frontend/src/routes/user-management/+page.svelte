<script>
  import axios from 'axios';
  import MultiSelect from "svelte-multiselect";
  import {page} from '$app/stores';

  // For displaying users
  let { usersData, groupList, groupListPerUser } = $page.data;

  // For creating user
  let username = '', password = '', email = '', isActive = true, selectedGrps = [];
  let usrMsg = '', pwdMsg = '', emailMsg ='';

  // For creating group
  let newGroup = '';

  // Notification : create group / user
  let createMsg='', isCreated = false;

  // For editing user credentials
  let editingIdx = null;
  let tempData = {}, origGrpSelectn = [];
  let isSaved = false, savedPwdMsg = '', savedEmailMsg = '', savedMsg="";

  async function createGroup() {   
        try {
            const response = await axios.post('http://localhost:3000/ums/createGroup', {
                newGroup : newGroup
            }, {
                headers: { 
                    'Content-Type': 'application/json'
                },
                withCredentials: true // for including cookies
            });

            if (response.data.success) {
                // Notification
                createMsg = response.data.message;
                isCreated = response.data.success;
                setTimeout(()=>{createMsg=''}, 4000);
                // Update group list 
                groupList = [newGroup, ...groupList];
                // Reset input field
                newGroup = '';
            } else {
                // Show error messages
                createMsg = response.data.message;
                isCreated = response.data.success;
            }
        } catch (err) {
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                location.reload(); // Unauthorised or Forbidden
            } else {
                console.error('Error creating group: ', err);
            }
        }
  }

  async function createNewUser() {
    if (editingIdx !== null) {
        cancelEdit();
    }
    
    const newUser = {
        username,
        password,
        email,
        isActive,
        selectedGrps
    };

    try {
      const response = await axios.post('http://localhost:3000/ums/createUser',{
            newUser : newUser
        }, {
            headers: { 
                'Content-Type': 'application/json'
            }, 
            withCredentials: true // include cookies
        });

        if (response.data.success) {
            // Insert row for new user
            usersData = [response.data.createdUser, ...usersData];
            // Update selected grps for new user
            groupListPerUser[username] = selectedGrps;
            // Notification
            createMsg = response.data.message;
            isCreated = response.data.success;
            setTimeout(()=>{createMsg=''}, 4000);
            // Reset error msgs
            usrMsg = ''; pwdMsg = ''; emailMsg = '';
            // Reset form inputs
            username =''; password='';email=''; isActive=true; selectedGrps=[];
       } else {
            // Show error msgs 
            usrMsg = response.data.usrMsg;
            pwdMsg = response.data.pwdMsg;
            emailMsg = response.data.emailMsg;
       }
    } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                location.reload(); // Unauthorised or Forbidden
        } else {
            console.error('Error creating user:', err);
        }
    }
  }

  // Edit row mode
  function editRow(index) {
    // Exit any pre-existing edit mode
    if (editingIdx !== null) {
        cancelEdit();
    }

    savedMsg = ""; // clear existing notif (if any)
    editingIdx = index;

    // Store orig assigned grps as deep copy
    origGrpSelectn = [...(groupListPerUser[usersData[index].username] || [] )];
    // temporary store for updates to user information 
    tempData = {...usersData[index]};
    tempData.password = "";
    tempData.selectedGrps = [...groupListPerUser[tempData.username] || []];
    console.log("Now editing at row ", index, " : ", tempData);
  }
  // Cancel edits w/o saving
  function cancelEdit() {
    // Revert changes (if any) to groups
    if (editingIdx !== null && tempData.username) {
        groupListPerUser[tempData.username] = [...origGrpSelectn];
    }
    console.log('Cancelling edit.');
    editingIdx = null;
    tempData = {};
    savedEmailMsg='';savedPwdMsg='';
    origGrpSelectn = [];
  }

  // Save row, send update data and exit edit mode.
  async function saveRow(index) {
    try {
        const response = await axios.put('http://localhost:3000/ums/editUser', {
        tempData 
        }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true // include cookies
        });
        if (response.data.success) {
            // Update changed credentials and assigned groups
            usersData[index] = { ...response.data.updatedUser};
            groupListPerUser[tempData.username] = tempData.selectedGrps;
            // Reset error msgs & editing mode
            editingIdx = null;
            savedEmailMsg = '';
            savedPwdMsg = '';
            isSaved = response.data.success;
            savedMsg = response.data.message;
            setTimeout(() => { isSaved = false; savedMsg=''}, 3000);
        } else {
            savedEmailMsg = response.data.emailErrMsg;
            savedPwdMsg = response.data.pwdErrMsg;
            isSaved = response.data.success;
            savedMsg = response.data.message;
            setTimeout(() => { isSaved = false; savedMsg=''}, 3000);
        }
    } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                location.reload(); // Unauthorised or Forbidden
        } else {
            console.error("Error saving user: ", err);
        }
    }
  }

</script>

<!-- Save User Notification -->
{#if savedMsg}
    <span class="errorMsg notification" style="color: {isSaved? 'green': 'red'}; background-color: {isSaved? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{savedMsg}</span>
{/if}

<h1>User Management</h1>

<!-- Create Group -->
<span>New Group: </span>
<input type="text" placeholder="Enter a new group" bind:value={newGroup} on:focus={()=> createMsg=""} required> 
<button on:click|preventDefault={createGroup}>Add Group</button>

<!-- Notification: Create Group / Create User -->
{#if createMsg}
    <span class="errorMsg" style="color: {isCreated? 'green': 'red'}; background-color: {isCreated? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}" >{createMsg}</span>
{/if}

<!-- Display users information -->
<table class="table">
    <thead>
        <tr>
            <th>Username</th>
            <th>Password</th>
            <th>Email</th>
            <th>Group</th>
            <th>Active</th>
            <th>Action</th>
        </tr>
    </thead>
    <tbody>
        <!-- Create New User -->
        <tr>
            <!-- New username -->
            <td>
                <input type="text" placeholder="Enter username" bind:value={username} 
                on:focus={()=> {usrMsg=""; createMsg=""}}><br>
                {#if usrMsg}
                    <span class="errorMsg">{usrMsg}</span>
                {/if}
            </td>
            <!-- Password -->
            <td>
                <input type="password" placeholder="Enter password" bind:value={password}  on:focus={()=> {pwdMsg=""; createMsg=""}}><br>
                {#if pwdMsg}
                <span class="errorMsg">{pwdMsg}</span>
                {/if}
            </td>
            <!-- Email -->
            <td>
                <input type="email" placeholder="Enter email" bind:value={email} on:focus={()=>{emailMsg=""; createMsg=""}}><br>
                {#if emailMsg}
                    <span class="errorMsg">{emailMsg}</span>
                {/if}
            </td>

            <!-- Assigned groups -->
            <td>
                <MultiSelect
                options={groupList}
                placeholder="No groups assigned" 
                maxSelect={groupList.length - 1}
                bind:selected={selectedGrps}
                ></MultiSelect>
            </td>
            <!-- Active Status -->
            <td><input type="checkbox" bind:checked={isActive}></td>
            <!-- Action -->
            <td><button on:click|preventDefault={createNewUser}>Create</button></td>

        </tr>

        {#each usersData as row, index}
            <tr>
                {#if editingIdx === index}
                    <!-- Editable row -->
                    <!-- (RO) Username -->
                    <td>{tempData.username}</td>
                    <!-- Password -->
                    <td><input type="password" bind:value={tempData.password}>
                        {#if savedPwdMsg}
                            <span class="errorMsg">{savedPwdMsg}</span>
                        {/if}
                    </td>
                    <!-- Email -->
                    <td><input type="email" bind:value={tempData.email}>
                        {#if savedEmailMsg}
                            <span class="errorMsg">{savedEmailMsg}</span>
                        {/if}
                    </td>
                    <!-- Assigned Groups -->
                    <td>
                        <MultiSelect
                        options={groupList}
                        maxSelect={groupList.length - 1}
                        bind:selected={tempData.selectedGrps}
                        placeholder="No groups assigned"
                        ></MultiSelect>
                    </td>
                    <!-- Active Status -->
                    <td>
                        <input type="checkbox" bind:checked={tempData.isActive}>
                    </td>
                    <!-- Action-->
                    <td>
                    <button on:click={() => saveRow(index)}>Save</button>
                    <button on:click={cancelEdit}>Cancel</button>
                    </td>
                {:else}
                    <!-- Read-only row -->
                    <!-- Username -->
                    <td>{row.username}</td>
                    <!-- Password -->
                    <td>**********</td>
                    <!-- Email -->
                    <td>{row.email}</td>
                    <!-- Group -->
                    <td>
                        <MultiSelect
                        options={groupList}
                        maxSelect={groupList.length - 1}
                        bind:selected={groupListPerUser[row.username]}
                        placeholder="No groups assigned"
                        disabled></MultiSelect>
                    </td>
                    <!-- Active Status -->
                    <td>                    
                        <input type="checkbox" bind:checked={row.isActive} disabled>
                    </td>
                    <!-- Action-->
                    <td><button on:click={() => editRow(index)}>Edit</button></td>
                {/if}
            </tr>
        {/each}
    </tbody>
</table>            

<style>
    h1 {
        font-size: 24px;
    }
    .table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
    }
    .table th, .table td {
        border: 1px solid #dee2e6;
        padding: 12px;
        text-align: left;
    }
    .table th {
        background-color: #f8f9fa;
        color: #212529;
        font-weight: bold;
    }
    .table tbody tr:nth-child(even) {
        background-color: #f2f2f2;
    }
    .table tbody tr:hover {
        background-color: #e9ecef;
    }
    button {
        margin: 3px;
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
    .notification {
        position: fixed;
        top: 20px;
        right: 50%; 
        padding: 10px;
        border-radius: 3px;
        z-index: 1000; 
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

</style>
