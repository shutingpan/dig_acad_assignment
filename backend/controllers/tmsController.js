const db = require("../config/db");
const { checkGroup } = require("./authController");
const transporter = require("../config/nodemailer");

// App Acronym is alphanumeric
const appAcronym_RegEx = /^[a-zA-Z0-9]+$/;
// Plan MVP Name is alphanumeric
const planMVPName_RegEx = /^[a-zA-Z0-9]+$/;
// Task name is alphanumeric & spaces
const taskName_RegEx = /^[a-zA-Z0-9]+$/;

function stampNotes(newNote, currentNotes, owner, taskState) {
  // Stamp with username, datetime and task state
  const dateTimestamp = new Date().toISOString().slice(0, 10) + " " + new Date().toLocaleTimeString();
  return `**********\nUser: ${owner} | State: ${taskState} | ${dateTimestamp}\n\n` + newNote + "\n\n" + currentNotes;
}

// Returns app list, group list, & PL [hardcoded] status
exports.getAllApps = async (req, res) => {
  const username = req.username;
  const appsQuery = "SELECT * FROM application";
  const grpListQuery = "SELECT DISTINCT groupname from user_groups";

  try {
    // PL status
    const isPL = await checkGroup(username, "pl");
    // App list
    const apps = await new Promise((resolve, reject) => {
      db.query(appsQuery, (error, results) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });
    // Group list
    const grpList = await new Promise((resolve, reject) => {
      db.query(grpListQuery, (error, results) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });

    // Format grpList into array of groupnames
    const groups = grpList.map(row => row.groupname);

    // Send back data
    return res.json({ success: true, apps, groups, isPL });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Failed to retrieve app data." });
  }
};

exports.createApp = async (req, res) => {
  const { newApp } = req.body;
  const checkAppAcroQuery = "SELECT app_acronym FROM application WHERE app_acronym=?";
  const insertAppQuery = "INSERT INTO application VALUES (?,?,?,?,?,?,?,?,?,?)";
  const newAppFields = [newApp.app_acronym, newApp.app_description, newApp.app_rnumber, newApp.app_startdate, newApp.app_enddate, newApp.app_permit_open, newApp.app_permit_todolist, newApp.app_permit_doing, newApp.app_permit_done, newApp.app_permit_create];

  try {
    // Check if app already exists
    const isNewApp = await new Promise((resolve, reject) => {
      db.query(checkAppAcroQuery, [newApp.app_acronym], (error, results) => {
        if (error) return reject(error);
        resolve(results.length === 0);
      });
    });

    // Check app acronym passes regex
    if (!isNewApp) {
      return res.json({ success: false, message: "App already exists." });
    } else if (appAcronym_RegEx.test(newApp.app_acronym)) {
      // Create new app in db
      await new Promise((resolve, reject) => {
        db.query(insertAppQuery, newAppFields, error => {
          if (error) return reject(error);
          resolve();
        });
      });
      // Send response
      return res.json({ success: true, message: "New app successfully created: " + newApp.app_acronym });
    } else {
      // Invalid app acronym
      return res.json({ success: false, message: "Invalid app acronym." });
    }
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot create app." });
  }
};

// Given app acronym - Return app
exports.getAppDetails = async (req, res) => {
  const { appName } = req.body;
  const getAppQuery = "SELECT * FROM application WHERE app_acronym=?";

  try {
    // Get app
    const app = await new Promise((resolve, reject) => {
      db.query(getAppQuery, [appName], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });
    // Send response
    return res.json({ success: true, app });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Failed to get app details." });
  }
};

// Given app acronym - Return plan list & PM [hardcoded] status
exports.getAllPlans = async (req, res) => {
  const username = req.username;
  const { appName } = req.body;
  const getPlansQuery = "SELECT * FROM plan WHERE plan_app_acronym = ?";

  try {
    // PM status
    const isPM = await checkGroup(username, "pm");
    // Plan list
    const plans = await new Promise((resolve, reject) => {
      db.query(getPlansQuery, [appName], (error, results) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });
    // Send response
    return res.json({ success: true, isPM, plans });
  } catch (err) {
    console.error("Error occurred:", err);
    return res.json({ success: false, message: "Failed to get all plans." });
  }
};

exports.createPlan = async (req, res) => {
  const { appName, newPlan } = req.body;
  const checkNewPlanQuery = "SELECT * FROM plan WHERE plan_app_acronym = ? AND plan_mvp_name = ?";
  const insertPlanQuery = "INSERT INTO plan VALUES (?,?,?,?,?)";
  const newPlanFields = [newPlan.plan_mvp_name, newPlan.plan_startdate, newPlan.plan_enddate, appName, newPlan.plan_colour];

  try {
    // Check if plan alr exist under app
    const isNewPlan = await new Promise((resolve, reject) => {
      db.query(checkNewPlanQuery, [appName, newPlan.plan_mvp_name], (error, results) => {
        if (error) return reject(error);
        resolve(results.length === 0);
      });
    });

    if (!isNewPlan) {
      return res.json({ success: false, message: "Plan already exists for " + appName });
    } else if (planMVPName_RegEx.test(newPlan.plan_mvp_name)) {
      // Create new plan
      await new Promise((resolve, reject) => {
        db.query(insertPlanQuery, newPlanFields, error => {
          if (error) return reject(error);
          return resolve();
        });
      });
      return res.json({ success: true, message: "Plan successfully created: " + newPlan.plan_mvp_name });
    } else {
      return res.json({ success: false, message: "Invalid plan." });
    }
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot create plan." });
  }
};

// Returns tasks, plan-colours and user permits under app
exports.getTaskboard = async (req, res) => {
  const username = req.username;
  const { appName } = req.body;
  const getAppTasksQuery = "SELECT task_id, task_name, task_owner, task_plan, task_state FROM task WHERE task_app_acronym =?";
  const getAppPlansQuery = "SELECT plan_mvp_name, plan_colour FROM plan WHERE plan_app_acronym=?";
  const getAppPermits = "SELECT app_permit_create, app_permit_open, app_permit_todolist, app_permit_doing, app_permit_done FROM application WHERE app_acronym=?";

  try {
    // Check permissions for this user
    const appPermits = await new Promise((resolve, reject) => {
      db.query(getAppPermits, [appName], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    const taskCreate = await checkGroup(username, appPermits[0].app_permit_create);
    const taskOpen = await checkGroup(username, appPermits[0].app_permit_open);
    const taskTodo = await checkGroup(username, appPermits[0].app_permit_todolist);
    const taskDoing = await checkGroup(username, appPermits[0].app_permit_doing);
    const taskDone = await checkGroup(username, appPermits[0].app_permit_done);

    // Get plan-colour pairings under this app
    const appPlans = await new Promise((resolve, reject) => {
      db.query(getAppPlansQuery, [appName], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    const planColPairs = appPlans.reduce((acc, { plan_mvp_name, plan_colour }) => {
      acc[plan_mvp_name] = plan_colour;
      return acc;
    }, {});

    // Get tasks under this app & organize into 5 states
    const appTasks = await new Promise((resolve, reject) => {
      db.query(getAppTasksQuery, [appName], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });

    const openTasks = [];
    const todoTasks = [];
    const doingTasks = [];
    const doneTasks = [];
    const closedTasks = [];

    appTasks.forEach(task => {
      switch (task.task_state) {
        case "Open":
          openTasks.push(task);
          break;
        case "Todo":
          todoTasks.push(task);
          break;
        case "Doing":
          doingTasks.push(task);
          break;
        case "Done":
          doneTasks.push(task);
          break;
        case "Closed":
          closedTasks.push(task);
          break;
      }
    });

    return res.json({ success: true, planColPairs, openTasks, todoTasks, doingTasks, doneTasks, closedTasks, permits: { taskCreate, taskOpen, taskTodo, taskDoing, taskDone } });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot get taskboard information." });
  }
};

exports.createTask = async (req, res) => {
  const { newTask } = req.body;
  const username = req.username;

  try {
    // Check unique & valid task name under app
    // const isTaskExist = await new Promise((resolve, reject) => {
    //   db.query("SELECT * FROM task WHERE task_app_acronym =? AND task_name=?", [newTask.task_app_acronym, newTask.task_name], (error, results) => {
    //     if (error) return reject(error);
    //     resolve(results.length > 0);
    //   });
    // });

    // if (isTaskExist) {
    //   return res.json({ success: false, message: "Task already exists" });
    // } else if (!taskName_RegEx.test(newTask.task_name)) {
    //   return res.json({ success: false, message: "Invalid task name" });
    // }

    if (!taskName_RegEx.test(newTask.task_name)) {
      return res.json({ success: false, message: "Invalid task name" });
    }

    // Stamp notes (if any)
    if (newTask.task_notes.trim() !== "") {
      newTask.task_notes = stampNotes(newTask.task_notes, "", username, "-");
    }

    // Get creation date
    const createDate = new Date().toISOString().split("T")[0];

    // Set task id
    const currentRnumber = await new Promise((resolve, reject) => {
      db.query("SELECT app_rnumber FROM application WHERE app_acronym =?", [newTask.task_app_acronym], (error, results) => {
        if (error) return reject(error);
        resolve(results[0].app_rnumber);
      });
    });

    let newRnumber = currentRnumber + 1;
    let task_id = `${newTask.task_app_acronym}_${newRnumber}`;

    const updateRnumberQuery = "UPDATE application SET app_rnumber = ? WHERE app_acronym =?";
    const insertNewTaskQuery = "INSERT INTO task VALUES (?,?,?,?,?,?,?,?,?,?)";
    const insertFields = [newTask.task_name, newTask.task_description, newTask.task_notes, task_id, newTask.task_plan, newTask.task_app_acronym, "Open", username, username, createDate];

    // BEGIN TRANSACTION
    db.beginTransaction(async err => {
      if (err) {
        console.error("Error starting transaction:", err);
        return res.status(500).json({ success: false, message: "Transaction error" });
      }

      try {
        // Update the R number
        await new Promise((resolve, reject) => {
          db.query(updateRnumberQuery, [newRnumber, newTask.task_app_acronym], error => {
            if (error) return reject(error);
            resolve();
          });
        });

        // Insert the new task
        await new Promise((resolve, reject) => {
          db.query(insertNewTaskQuery, insertFields, error => {
            if (error) return reject(error);
            resolve();
          });
        });

        // Commit the transaction
        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error("Error committing transaction:", err);
              return res.status(500).json({ success: false, message: "Transaction failed" });
            });
          }
          console.log("Transaction Complete! New task:", newTask, "task_id:", task_id);
          return res.json({ success: true, message: "Task created successfully: " + newTask.task_name, createdTask: { task_id: task_id, task_name: newTask.task_name, task_plan: newTask.task_plan, task_owner: username, task_state: "Open" } });
        });
      } catch (error) {
        // Rollback the transaction on error
        db.rollback(() => {
          console.error("Transaction error:", error);
          return res.status(500).json({ success: false, message: "Transaction failed", error: error.message });
        });
      }
    });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot create task" });
  }
};

// Returns task details and plan list under app
exports.getTask = async (req, res) => {
  const { appName, taskId } = req.body;
  const getTaskQuery = "SELECT * FROM task WHERE task_app_acronym=? AND task_id=?";
  const getPlansQuery = "SELECT plan_mvp_name FROM plan WHERE plan_app_acronym=?";

  try {
    const task = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [appName, taskId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    const plans = await new Promise((resolve, reject) => {
      db.query(getPlansQuery, [appName], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
    // Format data into array of plan_mvp_name(s)
    const planList = plans.map(rowData => rowData.plan_mvp_name);

    return res.json({ success: true, task, planList });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot get task." });
  }
};

// Changes: task state, notes (if any), plan (at Open) and owner
exports.promoteTask = async (req, res) => {
  const username = req.username;
  const { taskId, newNote, selectedPlan } = req.body;
  const getTaskQuery = "SELECT * FROM task WHERE task_id = ?";
  let promoteTaskQuery = "UPDATE task SET task_state=?, task_plan=?, task_notes=?, task_owner=? WHERE task_id=?";
  let updatedNotes = "";
  let promotedState;

  try {
    // Get current task by task id
    const task = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [taskId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });
    // Set promotion state
    switch (task.task_state) {
      case "Open":
        promotedState = "Todo";
        break;
      case "Todo":
        promotedState = "Doing";
        break;
      case "Doing":
        promotedState = "Done";
        break;
      case "Done":
        promotedState = "Closed";
        break;
      default:
        console.log("This task is not promotable.");
    }

    if (newNote.trim() !== "") {
      // With stamped new note
      updatedNotes = stampNotes(newNote, task.task_notes, username, task.task_state);
      db.query(promoteTaskQuery, [promotedState, selectedPlan, updatedNotes, username, taskId], error => {
        if (error) throw error;
      });
    } else {
      // No new note
      promoteTaskQuery = "UPDATE task SET task_state=?, task_plan=?, task_owner=? WHERE task_id=?";
      db.query(promoteTaskQuery, [promotedState, selectedPlan, username, taskId], error => {
        if (error) throw error;
      });
    }

    // To update in taskboard
    const promotedTask = {
      task_id: taskId,
      task_name: task.task_name,
      task_owner: username,
      task_plan: selectedPlan,
      task_state: promotedState
    };

    // Send email for tasks pending review
    if (promotedState === "Done") {
      // Get permitted user grp to review task
      const getAppPermit = "SELECT app_permit_done FROM application WHERE app_acronym =?";
      const emailGrp = await new Promise((resolve, reject) => {
        db.query(getAppPermit, [task.task_app_acronym], (error, results) => {
          if (error) return reject(error);
          resolve(results[0].app_permit_done);
        });
      });

      // Get email list of permitted user grp
      const getEmailListQuery = "SELECT group_concat(email) as emailList FROM accounts WHERE username IN (SELECT username FROM user_groups WHERE groupname=?)";
      const emailList = await new Promise((resolve, reject) => {
        db.query(getEmailListQuery, [emailGrp], (error, results) => {
          if (error) return reject(error);
          resolve(results[0].emailList);
        });
      });

      // Send email
      const emailMsg = {
        from: process.env.EMAIL_USER,
        to: emailList,
        subject: "Task Pending Review",
        text: `Dear Team,
        A task in the Task Management System requires your review and approval.

        ID: ${taskId}

        Please log in to the system and review the task at your earliest convenience.`,
        html: `<p>Dear Team,</p>
        <p>A task in the <strong>Task Management System</strong> requires your review and approval.</p>
        <p>ID: ${taskId}</p>
        <p>Please log in to the system and review the task at your earliest convenience.</p>`
      };

      transporter.sendMail(emailMsg, (err, info) => {
        if (err) {
          console.log("Error occurred: ", err.message);
          return;
        }
        console.log("Message sent: %s", info);
      });
    }

    return res.json({ success: true, message: "Task promoted: " + taskId, promotedTask });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Error occurred while promoting task" });
  }
};

// Changes: task state, notes(if any), plan (for demotion from Done) and owner
exports.demoteTask = async (req, res) => {
  const username = req.username;
  const { taskId, newNote, selectedPlan } = req.body;
  const getTaskQuery = "SELECT * FROM task WHERE task_id = ?";
  let demoteTaskQuery = "UPDATE task SET task_state=?, task_notes=?, task_plan=?, task_owner=? WHERE task_id=?";
  let updatedNotes = "";
  let demotedState;

  try {
    // Get current task by task id
    const task = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [taskId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    // Set demotion state
    switch (task.task_state) {
      case "Doing":
        demotedState = "Todo";
        break;
      case "Done":
        demotedState = "Doing";
        break;
      default:
        console.log("This task is not demotable.");
    }

    if (newNote.trim() !== "") {
      // With stamped new note
      updatedNotes = stampNotes(newNote, task.task_notes, username, task.task_state);
      db.query(demoteTaskQuery, [demotedState, updatedNotes, selectedPlan, username, taskId], error => {
        if (error) throw error;
      });
    } else {
      // No new note
      demoteTaskQuery = "UPDATE task SET task_state=?, task_plan=?, task_owner=? WHERE task_id=?";
      db.query(demoteTaskQuery, [demotedState, selectedPlan, username, taskId], error => {
        if (error) throw error;
      });
    }

    // To update in taskboard
    const demotedTask = {
      task_id: taskId,
      task_name: task.task_name,
      task_owner: username,
      task_plan: selectedPlan,
      task_state: demotedState
    };

    return res.json({ success: true, message: "Task demoted: " + taskId, demotedTask });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot demote task" });
  }
};

// Changes: plan (only effective at Open state), notes (if any) and owner
exports.updateTask = async (req, res) => {
  const username = req.username;
  const { taskId, newNote, selectedPlan } = req.body;
  let updatedNotes = "";
  let updateTaskQuery = "UPDATE task SET task_plan =?, task_notes=?, task_owner =? WHERE task_id = ?";

  try {
    // Get current task by task id
    const task = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM task WHERE task_id=?", [taskId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    if (newNote.trim() !== "") {
      // With stamped new note
      updatedNotes = stampNotes(newNote, task.task_notes, username, task.task_state);
      db.query(updateTaskQuery, [selectedPlan, updatedNotes, username, taskId], error => {
        if (error) throw error;
      });
    } else {
      // No new note
      updateTaskQuery = "UPDATE task SET task_plan =?, task_owner =? WHERE task_id=?";
      db.query(updateTaskQuery, [selectedPlan, username, taskId], error => {
        if (error) throw error;
      });
    }

    // To update in taskboard
    const updatedTask = {
      task_id: taskId,
      task_name: task.task_name,
      task_owner: username,
      task_plan: selectedPlan,
      task_state: task.task_state
    };

    // Send response
    return res.json({ success: true, message: "Saved changes for " + taskId, updatedTask, updatedNotes });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot save changes." });
  }
};

exports.isPermittedAction = async (req, res, next) => {
  const username = req.username;
  const getTaskQuery = "SELECT * FROM task WHERE task_id = ?";
  const getAppQuery = "SELECT * FROM application WHERE app_acronym = ?";
  let isPermitted = false;

  try {
    if (req.body.taskId) {
      // For routes under existing tasks
      const { taskId } = req.body;

      // Get task by task id
      const task = await new Promise((resolve, reject) => {
        db.query(getTaskQuery, [taskId], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Get app
      const app = await new Promise((resolve, reject) => {
        db.query(getAppQuery, [task.task_app_acronym], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Check relevant permit against task state
      switch (task.task_state) {
        case "Open":
          isPermitted = await checkGroup(username, app.app_permit_open);
          break;
        case "Todo":
          isPermitted = await checkGroup(username, app.app_permit_todolist);
          break;
        case "Doing":
          isPermitted = await checkGroup(username, app.app_permit_doing);
          break;
        case "Done":
          isPermitted = await checkGroup(username, app.app_permit_done);
          break;
      }
    } else {
      // For route under task creation
      const { newTask } = req.body;

      // Get app
      const app = await new Promise((resolve, reject) => {
        db.query(getAppQuery, [newTask.task_app_acronym], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      isPermitted = await checkGroup(username, app.app_permit_create);
    }

    if (!isPermitted) {
      return res.status(403).json({ success: false, message: "Not allowed to perform action." });
    }
    next();
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.status(500).json({ success: false, message: "Cannot permit user." });
  }
};
