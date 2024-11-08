const db = require("../config/db");
const { checkGroup } = require("./authController");
const transporter = require("../config/nodemailer");
const bcryptJS = require("bcryptjs");

/**  Trying for assignment 3 */
const util = require("util");
const query = util.promisify(db.query).bind(db);
/**  ------------------------ */

// App Acronym is alphanumeric
const appAcronym_RegEx = /^[a-zA-Z0-9]+$/;
// Plan MVP Name is alphanumeric
const planMVPName_RegEx = /^[a-zA-Z0-9\s]+$/;
// Task name is alphanumeric
const taskName_RegEx = /^[a-zA-Z0-9\s]+$/;
// Rnumber is 0 or positive integer
const rNum_Regex = /^(0|[1-9]\d*)$/;

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

    // Check rnumber
    if (!rNum_Regex.test(newApp.app_rnumber)) {
      return res.json({ success: false, message: "Invalid Rnumber." });
    }

    if (!isNewApp) {
      // If app alr exist
      return res.json({ success: false, message: "App already exists." });
    } else if (appAcronym_RegEx.test(newApp.app_acronym)) {
      // If app acronym passes regex, create new app in db
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

exports.editApp = async (req, res) => {
  const { editingApp } = req.body;
  const editAppQuery = "UPDATE application SET app_startdate=?, app_enddate=?, app_permit_create=?, app_permit_open=?, app_permit_todolist=?, app_permit_doing=?, app_permit_done=?, app_description=? WHERE app_acronym=?";
  const editedAppFields = [editingApp.app_startdate, editingApp.app_enddate, editingApp.app_permit_create, editingApp.app_permit_open, editingApp.app_permit_todolist, editingApp.app_permit_doing, editingApp.app_permit_done, editingApp.app_description, editingApp.app_acronym];

  try {
    // Ensure dates are still valid
    const date_RegEx = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!date_RegEx.test(editingApp.app_startdate) || !date_RegEx.test(editingApp.app_enddate)) {
      return res.json({ success: false, message: `Invalid date.` });
    }

    // Save app edits
    await new Promise((resolve, reject) => {
      db.query(editAppQuery, editedAppFields, error => {
        if (error) return reject(error);
        resolve();
      });
    });

    return res.json({ success: true, message: `App saved: ${editingApp.app_acronym}`, editingApp });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: `Cannot edit app: ${editingApp.app_acronym}` });
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

// Returns plan list under app (for plan selection under task)
exports.getPlanList = async (req, res) => {
  const { taskId } = req.body;
  const getTaskQuery = "SELECT * FROM task WHERE task_id=?";
  const getPlansQuery = "SELECT plan_mvp_name FROM plan WHERE plan_app_acronym=?";

  try {
    const task = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [taskId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    const plans = await new Promise((resolve, reject) => {
      db.query(getPlansQuery, [task.task_app_acronym], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
    // Format data into array of plan_mvp_name(s)
    const planList = plans.map(rowData => rowData.plan_mvp_name);

    return res.json({ success: true, planList });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot get plan list." });
  }
};

// Returns tasks, plan-colours and user permits under app
exports.getTaskboard = async (req, res) => {
  const username = req.username;
  const { appName } = req.body;
  const getAppTasksQuery = "SELECT * FROM task WHERE task_app_acronym =?";
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
    if (!taskName_RegEx.test(newTask.task_name)) {
      return res.json({ success: false, message: "Invalid task name" });
    }

    // Stamp notes (if any)
    // if (newTask.task_notes.trim() !== "") {
    newTask.task_notes = stampNotes("Task created\n\n" + newTask.task_notes, "", username, "-");
    // }

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
          return res.json({ success: true, message: "Task created successfully: " + newTask.task_name, createdTask: { task_id, task_name: newTask.task_name, task_plan: newTask.task_plan, task_owner: username, task_state: "Open", task_description: newTask.task_description, task_notes: newTask.task_notes, task_app_acronym: newTask.task_app_acronym, task_creator: username, task_createdate: createDate } });
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

// Changes: task state, notes (if any), plan (at Open) and owner
exports.promoteTask = async (req, res) => {
  const username = req.username;
  const { task_id, newNote, selectedPlan } = req.body;
  const getTaskQuery = "SELECT * FROM task WHERE task_id = ?";
  let promoteTaskQuery = "UPDATE task SET task_state=?, task_plan=?, task_notes=?, task_owner=? WHERE task_id=?";
  let updatedNotes = "";
  let promotedState;
  let auditStmt = "";

  try {
    // Get current task by task id
    const task = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [task_id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });
    // Set promotion state
    switch (task.task_state) {
      case "Open":
        promotedState = "Todo";
        auditStmt = "Promoting task from Open to Todo";
        break;
      case "Todo":
        promotedState = "Doing";
        auditStmt = "Promoting task from Todo to Doing";
        break;
      case "Doing":
        promotedState = "Done";
        auditStmt = "Promoting task from Doing to Done";
        break;
      case "Done":
        promotedState = "Closed";
        auditStmt = "Promoting task from Done to Closed";
        break;
      default:
        console.log("This task is not promotable.");
    }

    // if (newNote.trim() !== "") {
    // With stamped new note
    updatedNotes = stampNotes(auditStmt + "\n\n" + newNote, task.task_notes, username, task.task_state);
    db.query(promoteTaskQuery, [promotedState, selectedPlan, updatedNotes, username, task_id], error => {
      if (error) throw error;
    });
    // task;
    // } else {
    // No new note
    //   promoteTaskQuery = "UPDATE task SET task_state=?, task_plan=?, task_owner=? WHERE task_id=?";
    //   db.query(promoteTaskQuery, [promotedState, selectedPlan, username, task_id], error => {
    //     if (error) throw error;
    //   });
    // }

    // To update in taskboard
    const promotedTask = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [task_id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

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
        text: `Dear Team,\n\nA task in the Task Management System requires your review and approval.\n\nID: ${task_id}\n\nPlease log in to the system and review the task at your earliest convenience.`,
        html: `<p>Dear Team,</p>
        <p>A task in the <strong>Task Management System</strong> requires your review and approval.</p>
        <p>ID: ${task_id}</p>
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

    return res.json({ success: true, message: "Task promoted: " + task_id, promotedTask });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Error occurred while promoting task" });
  }
};

// Changes: task state, notes(if any), plan (for demotion from Done) and owner
exports.demoteTask = async (req, res) => {
  const username = req.username;
  const { task_id, newNote, selectedPlan } = req.body;
  const getTaskQuery = "SELECT * FROM task WHERE task_id = ?";
  let demoteTaskQuery = "UPDATE task SET task_state=?, task_notes=?, task_plan=?, task_owner=? WHERE task_id=?";
  let updatedNotes = "";
  let demotedState;
  let auditStmt = "";

  try {
    // Get current task by task id
    const task = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [task_id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    // Set demotion state
    switch (task.task_state) {
      case "Doing":
        demotedState = "Todo";
        auditStmt = "Demoting task from Doing to Todo";
        break;
      case "Done":
        demotedState = "Doing";
        auditStmt = "Demoting task from Done to Doing";
        break;
      default:
        console.log("This task is not demotable.");
    }

    // if (newNote.trim() !== "") {
    // With stamped new note
    updatedNotes = stampNotes(auditStmt + "\n\n" + newNote, task.task_notes, username, task.task_state);
    db.query(demoteTaskQuery, [demotedState, updatedNotes, selectedPlan, username, task_id], error => {
      if (error) throw error;
    });
    // } else {
    // No new note
    // demoteTaskQuery = "UPDATE task SET task_state=?, task_plan=?, task_owner=? WHERE task_id=?";
    // db.query(demoteTaskQuery, [demotedState, selectedPlan, username, task_id], error => {
    //   if (error) throw error;
    // });
    // }

    // To update in taskboard
    const demotedTask = await new Promise((resolve, reject) => {
      db.query(getTaskQuery, [task_id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    return res.json({ success: true, message: "Task demoted: " + task_id, demotedTask });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ success: false, message: "Cannot demote task" });
  }
};

// Changes: plan (only effective at Open state), notes (if any) and owner
exports.updateTask = async (req, res) => {
  const username = req.username;
  const { task_id, newNote, selectedPlan } = req.body;
  let updatedNotes = "";
  let updateTaskQuery = "UPDATE task SET task_plan =?, task_notes=?, task_owner =? WHERE task_id = ?";

  try {
    // Get current task by task id
    const task = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM task WHERE task_id=?", [task_id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    if (newNote.trim() !== "") {
      // With stamped new note
      updatedNotes = stampNotes(newNote, task.task_notes, username, task.task_state);
      db.query(updateTaskQuery, [selectedPlan, updatedNotes, username, task_id], error => {
        if (error) throw error;
      });
    } else {
      // No new note
      updateTaskQuery = "UPDATE task SET task_plan =?, task_owner =? WHERE task_id=?";
      db.query(updateTaskQuery, [selectedPlan, username, task_id], error => {
        if (error) throw error;
      });
    }

    // To update in taskboard
    const updatedTask = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM task WHERE task_id=?", [task_id], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    // Send response
    return res.json({ success: true, message: "Saved changes for " + task_id, updatedTask });
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
    if (req.body.task_id) {
      // For routes under existing tasks
      const { task_id, taskState } = req.body;

      // Get task by task id
      const task = await new Promise((resolve, reject) => {
        db.query(getTaskQuery, [task_id], (error, results) => {
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

      // Check if task state synced up btwn FE and BE
      if (taskState !== task.task_state) {
        return res.status(409).json({ success: false, message: `${task_id} no longer in ${taskState} state.` });
      }

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

/** ASSIGNMENT 3 */

exports.validateURL = (req, res, next) => {
  // No special characters (injection attacks)
  const forbiddenChars = /[&%^\-'"<>!?]/;
  console.log(req.originalUrl);
  if (forbiddenChars.test(req.originalUrl)) {
    return res.json({ code: "A001" });
  }
  next();
};

exports.validateBodyType = (req, res, next) => {
  // Validate type JSON object
  if (req.headers["content-type"] !== "application/json") {
    return res.json({ code: "B001" });
  }
  next();
};

function validateFields(body = {}, mandatoryFields = []) {
  // Check if any mandatory field is missing
  for (let i = 0; i < mandatoryFields.length; i++) {
    if (!body.hasOwnProperty(mandatoryFields[i])) {
      return false;
    }
  }
  return true;
}

async function validateCredentials(username, password) {
  try {
    // Fetch user from db
    const user = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM accounts WHERE username = ?", [username], (error, results) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });

    if (user.length === 0) {
      return { valid: false, code: "C001" }; // user does not exist
    }

    const hashedPwd = user[0].password;
    const isMatch = await bcryptJS.compare(password, hashedPwd);
    if (!isMatch || !user[0].isActive) {
      return { valid: false, code: "C001" }; // credentials dont match or disabled user
    }
    return { valid: true };
  } catch (err) {
    console.error("Error occurred: ", err);
    return { valid: false, code: "E004" };
  }
}

// Retrieve tasks in a particular state
exports.gettaskbystate = async (req, res) => {
  try {
    const { username, password, task_app_acronym, task_state } = req.body;
    const mandatoryFields = ["username", "password", "task_app_acronym", "task_state"];
    const validTaskStates = ["open", "todo", "doing", "done", "closed"];

    /** ------------ Validate body structure (key names) ---------------- */

    // Check all mandatory keys present
    if (!validateFields(req.body, mandatoryFields)) {
      return res.json({ code: "B002" });
    }

    /** ----------------- Checking data types --------------- */
    // User-related fields
    if (typeof username !== "string" || typeof password !== "string") {
      return res.json({ code: "C001" });
    }

    // Transaction-related fields
    if (typeof task_app_acronym !== "string" || typeof task_state !== "string") {
      return res.json({ code: "D001" });
    }

    /** ------------ IAM ---------------- */

    const isUserOK = await validateCredentials(username, password);
    if (!isUserOK.valid) {
      return res.json({ code: isUserOK.code });
    }

    /** ------------ Transaction ---------------- */

    // Check if valid task state
    if (!validTaskStates.includes(task_state.toLowerCase())) {
      return res.json({ code: "D001" });
    }

    // Check if valid app acronym
    const appMatch = await query("SELECT app_acronym FROM application WHERE app_acronym=?", [task_app_acronym]);

    if (appMatch.length === 0) {
      return res.json({ code: "D001" }); // app doesnt exist
    }

    const getAppPlansQuery = "SELECT plan_mvp_name, plan_colour FROM plan WHERE plan_app_acronym=?";
    const getAppTasksQuery = "SELECT task_id, task_name, task_owner, task_plan FROM task WHERE task_app_acronym =? AND task_state =?";

    // Get plan-colour pairings under this app
    const appPlans = await query(getAppPlansQuery, [task_app_acronym]);

    const planColPairs = appPlans.reduce((acc, { plan_mvp_name, plan_colour }) => {
      acc[plan_mvp_name] = plan_colour;
      return acc;
    }, {});

    // Get tasks by state
    const tasks = await query(getAppTasksQuery, [task_app_acronym, task_state]);

    // Reformatting
    tasks.forEach(rowDataPacket => {
      rowDataPacket["task_plan_colour"] = planColPairs[rowDataPacket.task_plan] || "";
      delete rowDataPacket.task_plan;
    });

    // Expected output
    return res.json({ tasks, code: "S000" });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ code: "E004" });
  }
};

// Approve task from 'Doing' to 'Done' state
exports.promotetask2done = async (req, res) => {
  try {
    const { username, password, task_id, task_notes } = req.body;
    const mandatoryFields = ["username", "password", "task_id"];

    /** ------------ Validate body structure (key names) ---------------- */

    // Check all mandatory keys present
    if (!validateFields(req.body, mandatoryFields)) {
      return res.json({ code: "B002" });
    }

    /** ----------------- Checking data types --------------- */
    // User-related fields
    if (typeof username !== "string" || typeof password !== "string") {
      return res.json({ code: "C001" });
    }

    // Transaction-related fields
    if (typeof task_id !== "string" || (task_notes && typeof task_notes !== "string")) {
      return res.json({ code: "D001" });
    }

    /** ------------ IAM ---------------- */

    const isUserOK = await validateCredentials(username, password);
    if (!isUserOK.valid) {
      return res.json({ code: isUserOK.code });
    }

    // Validate permissions - Check task_id exist
    const taskResults = await query("SELECT task_app_acronym, task_state, task_notes FROM task WHERE task_id=?", [task_id]);

    if (taskResults.length === 0) {
      return res.json({ code: "D001" }); // task_id doesnt exist
    }

    const task = taskResults[0];

    // Validate permissions - Check user in app_permit_doing
    const [permitResult] = await query("SELECT app_permit_doing FROM application WHERE app_acronym=?", [task.task_app_acronym]);

    if (!(await checkGroup(username, permitResult.app_permit_doing))) {
      return res.json({ code: "C003" }); // Wrong user group
    }

    /** ------------ Transaction ---------------- */

    if (task.task_state !== "Doing") {
      return res.json({ code: "D001" }); // task_id not in doing state
    }

    const promotedState = "Done";
    const auditStmt = "Promoting task from Doing to Done";
    const newNote = task_notes || "";
    const updatedNotes = stampNotes(auditStmt + "\n\n" + newNote, task.task_notes, username, task.task_state);

    // Promote task
    await query("UPDATE task SET task_state=?, task_notes=?, task_owner=? WHERE task_id=?", [promotedState, updatedNotes, username, task_id]);

    // Email: Retrieve app_permit_done group and email list
    const [groupResult] = await query("SELECT app_permit_done FROM application WHERE app_acronym = ?", [task.task_app_acronym]);

    const [emailListResult] = await query("SELECT group_concat(email) as emailList FROM accounts WHERE username IN (SELECT username FROM user_groups WHERE groupname=?)", [groupResult.app_permit_done]);

    const emailMsg = {
      from: process.env.EMAIL_USER,
      to: emailListResult.emailList,
      subject: "Task Pending Review",
      text: `Dear Team,\n\nA task in the Task Management System requires your review and approval.\n\nID: ${task_id}\n\nPlease log in to the system and review the task at your earliest convenience.`,
      html: `<p>Dear Team,</p><p>A task in the <strong>Task Management System</strong> requires your review and approval.</p><p>ID: ${task_id}</p><p>Please log in to the system and review the task at your earliest convenience.</p>`
    };

    // Send email
    transporter.sendMail(emailMsg, (err, info) => {
      if (err) {
        console.log("Error occurred: ", err.message);
        return;
      }
      console.log("Message sent: %s", info);
    });

    // Expected output
    return res.json({ code: "S000" });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ code: "E004" });
  }
};

// Create a new task
exports.createtask = async (req, res) => {
  try {
    const { username, password, task_app_acronym, task_name, task_description, task_notes, task_plan } = req.body;
    const mandatoryFields = ["username", "password", "task_app_acronym", "task_name"];

    /** ------------ Validate body structure (key names) ---------------- */

    // Check all mandatory keys present
    if (!validateFields(req.body, mandatoryFields)) {
      return res.json({ code: "B002" });
    }

    /** ----------------- Checking data types --------------- */
    // User-related fields
    if (typeof username !== "string" || typeof password !== "string") {
      return res.json({ code: "C001" });
    }

    // Transaction-related fields (existing) - app, plan
    if (typeof task_app_acronym !== "string" || (task_plan && typeof task_plan !== "string")) {
      return res.json({ code: "D001" });
    }

    // Transaction-related fields (created) - name, description, notes
    if (typeof task_name !== "string" || task_name.length > 50) {
      return res.json({ code: "D001" });
    }

    if ((task_description && typeof task_description !== "string") || (typeof task_description === "string" && task_description.length > 255)) {
      return res.json({ code: "D001" });
    }

    if (task_notes && typeof task_notes !== "string") {
      return res.json({ code: "D001" });
    }

    /** ------------ IAM ---------------- */

    const isUserOK = await validateCredentials(username, password);
    if (!isUserOK.valid) {
      return res.json({ code: isUserOK.code });
    }

    // Validate permissions - Check user in app_permit_create
    const permitResults = await query("SELECT app_permit_create FROM application WHERE app_acronym=?", [task_app_acronym]);

    if (permitResults.length === 0) {
      return res.json({ code: "D001" }); // task_app_acronym doesnt exist
    }

    if (!(await checkGroup(username, permitResults[0].app_permit_create))) {
      return res.json({ code: "C003" }); // Wrong user group
    }

    /** ------------ Transaction ---------------- */

    // Check existing plan
    if (task_plan) {
      // Ignore empty string (No plan)
      if (task_plan.trim() !== "") {
        console.log(task_plan);
        const planResults = await query("SELECT plan_mvp_name FROM plan WHERE plan_app_acronym=? AND plan_mvp_name=?", [task_app_acronym, task_plan]);
        if (planResults.length === 0) {
          return res.json({ code: "D001" }); // plan doesnt exist
        }
      }
    }

    // Check task_name
    if (!taskName_RegEx.test(task_name)) {
      return res.json({ code: "D001" });
    }

    // Format optional fields (description and plan) and note
    let taskDescription = task_description || "";
    let taskPlan = task_plan || "";
    let newNote = task_notes || "";
    let updatedNotes = stampNotes("Task created\n\n" + newNote, "", username, "-");
    // Get creation date
    const createDate = new Date().toISOString().split("T")[0];
    // Set task_id
    const [appResult] = await query("SELECT app_rnumber FROM application WHERE app_acronym=?", [task_app_acronym]);

    let newRnumber = appResult.app_rnumber + 1;
    let task_id = `${task_app_acronym}_${newRnumber}`;

    const updateRnumberQuery = "UPDATE application SET app_rnumber = ? WHERE app_acronym =?";
    const insertNewTaskQuery = "INSERT INTO task VALUES (?,?,?,?,?,?,?,?,?,?)";
    const insertFields = [task_name, taskDescription, updatedNotes, task_id, taskPlan, task_app_acronym, "Open", username, username, createDate];

    // BEGIN TRANSACTION
    db.beginTransaction(async err => {
      if (err) {
        console.error("Error starting transaction:", err);
        return res.json({ code: "E004" });
      }

      try {
        // Update the R number
        await query(updateRnumberQuery, [newRnumber, task_app_acronym]);

        // Insert the new task
        await query(insertNewTaskQuery, insertFields);

        // Commit the transaction
        db.commit(err => {
          if (err) {
            return db.rollback(() => {
              console.error("Error committing transaction:", err);
              return res.json({ code: "E004" });
            });
          }
          // Expected output
          return res.json({ task_id, code: "S000" });
        });
      } catch (error) {
        // Rollback the transaction on error
        db.rollback(() => {
          console.error("Transaction error:", error);
          return res.json({ code: "E004" });
        });
      }
    });
  } catch (err) {
    console.error("Error occurred: ", err);
    return res.json({ code: "E004" });
  }
};
