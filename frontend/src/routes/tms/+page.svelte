<script>
    import { goto } from "$app/navigation";
    import axios from "axios";
    import { onMount } from "svelte";

    // For displaying apps
    let apps = [];

    // For creating app
    let groups = [], isPL = false, createMsg = "", isCreated = false;
    let newApp = {
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

    // For editing app
    let editingApp = null; // track app being edited

    onMount(async () => {
        try {
            // Get app list, group list and PL status
            const response = await axios.get('http://localhost:3000/tms', {
            withCredentials: true
            });

            if (response.data.success) {
                apps = response.data.apps;
                groups = response.data.groups;
                isPL = response.data.isPL;
            } else {
                isCreated = response.data.success;
                createMsg = response.data.message;
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                goto('/login'); // Unauthorized 
            } else {
                console.error("An error occurred: ", err);
            }
        }
    });

    const createApp = async() => {
        try {
            const response = await axios.post('http://localhost:3000/tms/createApp', {
                newApp 
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });

            if (response.data.success) {
                // Set notification
                isCreated = response.data.success;
                createMsg = response.data.message;
                setTimeout(() => { createMsg=""}, 3000);
                // New app entry
                apps = [{...newApp}, ...apps];
                // Reset inputs
                newApp.app_acronym = '';
                newApp.app_rnumber = 0;
                newApp.app_startdate = '';
                newApp.app_enddate = '';
                newApp.app_permit_create = '';
                newApp.app_permit_open = '';
                newApp.app_permit_todolist = '';
                newApp.app_permit_doing = '';
                newApp.app_permit_done = '';
                newApp.app_description = '';
            } else {
                isCreated = response.data.success;
                createMsg = response.data.message;
                setTimeout(() => { createMsg=""}, 3000);
            }
        } catch (err) {
            if (err.response && err.response.status === 401) {
                goto('/login'); // Unauthorized 
            } else if (err.response && err.response.status === 403) {
                 // User without PL permissions
                isCreated = err.response.data.success;
                createMsg = err.response.data.message;
                setTimeout(() => {createMsg=""}, 3000);
                isPL = false;
            } else {
                console.error("An error occurred: ", err);
            }
        }
    }

     // Edit an app
     const editApp = (app) => {
        editingApp = { ...app }; // Set app being edited
    }

    // Save edited app
    const saveApp = async () => {
        try {
            console.log(editingApp);
            const response = await axios.post('http://localhost:3000/tms/editApp', {
                editingApp
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });

            if (response.data.success) {
                // Notif 
                isCreated = response.data.success;
                createMsg = response.data.message;
                setTimeout(() => { createMsg=""}, 3000);
                // Update the list with new data
                const index = apps.findIndex(app => app.app_acronym === editingApp.app_acronym);
                apps[index] = { ...editingApp }; 
                cancelEdit(); 

            } else {
                // Notif 
                isCreated = response.data.success;
                createMsg = response.data.message;
                setTimeout(() => { createMsg=""}, 3000);
            }
        } catch (err) {
            console.error("An error occurred: ", err);
        }
    }

    // Cancel editing
    const cancelEdit = () => {
        editingApp = null;
    }

    function goToApp(appName) {
        localStorage.setItem('appName', appName);
        goto('/tms/taskboard');
    }

</script>


    <div class="header">
        <h1>Apps Dashboard</h1>
    </div>

    <!-- Create App Notification -->
    {#if createMsg}
        <span class="errorMsg" style="color: {isCreated? 'green': 'red'}; background-color: {isCreated? 'rgb(171, 230, 167)':'rgb(255, 193, 193)'}">{createMsg}</span>
    {/if}

    <form on:submit|preventDefault={createApp}>
        <table class="app-table">
            <thead>
                <tr>
                    <th>App Acronym</th>
                    <th>Rnumber</th>
                    <th>Start date</th>
                    <th>End date</th>
                    <th>Create</th>
                    <th>Open</th>
                    <th>Todo</th>
                    <th>Doing</th>
                    <th>Done</th>
                    <th>Description</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {#if isPL}
                    <!-- Create App -->
                    <tr>
                        <td>
                            <!-- App Acronym -->
                            <input type="text" bind:value={newApp.app_acronym} maxlength="50" required>
                        </td>
                        <td>
                            <!-- Rnumber -->
                             <input type="text" bind:value={newApp.app_rnumber} required>
                        </td>
                        <td>
                            <!-- Start date -->
                            <input type="date" bind:value={newApp.app_startdate} max="9999-12-31" required>
                        </td>
                        <td>
                            <!-- End date -->
                            <input type="date" bind:value={newApp.app_enddate} max="9999-12-31" required>
                        </td>
                        <td>
                            <!-- Permission: Create -->
                            <select bind:value={newApp.app_permit_create}>
                                <option value="" selected>No group</option>
                                {#each groups as group}
                                    <option value={group}>{group}</option>
                                {/each}
                            </select>
                        </td>
                        <td>
                            <!-- Permission: Open -->
                            <select bind:value={newApp.app_permit_open}>
                                <option value="" selected>No group</option>
                                {#each groups as group}
                                    <option value={group}>{group}</option>
                                {/each}
                            </select>
                        </td>
                        <td>
                            <!-- Permission: To Do -->
                            <select bind:value={newApp.app_permit_todolist}>
                                <option value="" selected>No group</option>
                                {#each groups as group}
                                    <option value={group}>{group}</option>
                                {/each}
                            </select>
                        </td>
                        <td>
                            <!-- Permission: Doing -->
                            <select bind:value={newApp.app_permit_doing}>
                                <option value="" selected>No group</option>
                                {#each groups as group}
                                    <option value={group}>{group}</option>
                                {/each}
                            </select>
                        </td>
                        <td>
                            <!-- Permission: Done -->
                            <select bind:value={newApp.app_permit_done}>
                                <option value="" selected>No group</option>
                                {#each groups as group}
                                    <option value={group}>{group}</option>
                                {/each}
                            </select>
                        </td>
                        <td>
                            <!-- Description -->
                            <textarea placeholder="Enter a description (max 255 characters)..." rows="7" cols="40" maxlength="255" style="resize: none; width:100%;" bind:value={newApp.app_description}></textarea>
                        </td>
                        <td>
                            <button class="create-btn" type="submit">Create</button>
                        </td>
                    </tr>
                {/if}
                {#each apps as app}
                    <tr>
                        {#if editingApp && editingApp.app_acronym === app.app_acronym}
                                <!-- Editable Row -->
                                <td>{editingApp.app_acronym}</td>
                                <td>{editingApp.app_rnumber}</td>
                                <td><input type="date" bind:value={editingApp.app_startdate}></td>
                                <td><input type="date" bind:value={editingApp.app_enddate}></td>
                                <td>
                                    <select bind:value={editingApp.app_permit_create} required>
                                        <option value="">No group</option>
                                        {#each groups as group}<option value={group}>{group}</option>{/each}
                                    </select>
                                </td>
                                <td>
                                    <select bind:value={editingApp.app_permit_open} required>
                                        <option value="">No group</option>
                                        {#each groups as group}<option value={group}>{group}</option>{/each}
                                    </select>
                                </td>
                                <td>
                                    <select bind:value={editingApp.app_permit_todolist}>
                                        <option value="">No group</option>
                                        {#each groups as group}<option value={group}>{group}</option>{/each}
                                    </select>
                                </td>
                                <td>
                                    <select bind:value={editingApp.app_permit_doing}>
                                        <option value="">No group</option>
                                        {#each groups as group}<option value={group}>{group}</option>{/each}
                                    </select>
                                </td>
                                <td>
                                    <select bind:value={editingApp.app_permit_done}>
                                        <option value="">No group</option>
                                        {#each groups as group}<option value={group}>{group}</option>{/each}
                                    </select>
                                </td>
                                <td class="app-description">
                                    <textarea bind:value={editingApp.app_description} maxlength="255" rows="5"></textarea>
                                </td>
                                <td>
                                    <button type="button" on:click={saveApp}>Save</button>
                                    <button type="button" on:click={cancelEdit}>Cancel</button>
                                </td>

                        {:else}
                                <!-- Readonly -->
                                <td>{app.app_acronym}</td>
                                <td>{app.app_rnumber}</td>
                                <td>
                                    <input type="date" value={app.app_startdate} disabled>
                                </td>
                                <td>
                                    <input type="date" value={app.app_enddate} disabled>
                                </td>
                                <td>{app.app_permit_create}</td>
                                <td>{app.app_permit_open}</td>
                                <td>{app.app_permit_todolist}</td>
                                <td>{app.app_permit_doing}</td>
                                <td>{app.app_permit_done}</td>
                                <td class="app-description">
                                    <textarea value={app.app_description} rows="5" disabled></textarea>
                                </td>
                                <td>
                                    <button class="open-btn" type="button" on:click={() => goToApp(app.app_acronym)}>Open</button>
                                    <button class="open-btn" type="button" on:click={() => editApp(app)}>Edit</button>
                                </td>
                        {/if}
                    </tr>
                {/each}
            </tbody>
        </table>
    </form>
<style>
    .app-description textarea{
        resize: vertical;
        width: 100%;
    } 

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .header h1 {
        font-size: 24px;
    }

    .create-btn {
        background-color: #4CAF50;
        color: white;
        padding: 6px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .create-btn:hover {
        background-color: #45a049;
    }

    .app-table {
        width: 100%;
        border-collapse: collapse;
    }

    .app-table th, .app-table td {
        border: 1px solid #ddd;
        padding: 5px;
        text-align: center;
    }

    .app-table th {
        background-color: #f2f2f2;
        color: #333;
        font-weight: bold;
    }

    .app-table tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    .app-table tr:hover {
        background-color: #ddd;
    }

    .open-btn {
        background-color: #333;
        color: white;
        padding: 6px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin: 3px;
    }

    .open-btn:hover {
        background-color: #555;
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
