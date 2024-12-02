const db = require("../config/db");
const transporter = require("../config/nodemailer");
const bcryptJS = require("bcryptjs");

/**  Trying for assignment 3 */
const util = require("util");
const query = util.promisify(db.query).bind(db);
/**  ------------------------ */

// Task name is alphanumeric
const taskName_RegEx = /^[a-zA-Z0-9\s]+$/;

// Return value to indicate if a user is in a group
async function checkGroup(username, groupname) {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM user_groups WHERE username = ? AND groupname = ?", [username, groupname], (error, results) => {
      if (error) return reject(error);
      if (groupname === "") return resolve(false); // when groupname field empty
      return resolve(results.length > 0);
    });
  });
}

function stampNotes(newNote, currentNotes, owner, taskState) {
  // Stamp with username, datetime and task state
  const dateTimestamp = new Date().toISOString().slice(0, 10) + " " + new Date().toLocaleTimeString();
  return `**********\nUser: ${owner} | State: ${taskState} | ${dateTimestamp}\n\n` + newNote + "\n\n" + currentNotes;
}

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
