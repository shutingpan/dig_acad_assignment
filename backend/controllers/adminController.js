// For admin and individual user management.
const db = require("../config/db");
const bcryptJS = require("bcryptjs");

// Group is alphanumeric w or w/o underscore.
const group_RegEx = /^[a-zA-Z0-9_]+$/;
// (M) Username: must be alphanumeric
const username_RegEx = /^[a-zA-Z0-9]+$/;
// (M) Password: 8-10 characters inclusive, alphanumeric & special characters (no spaces)
const pwd_RegEx = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,10}$/;
// (O) Email: <xxx>@<domain>.com, can have _.
const email_RegEx = /^[a-zA-Z0-9_]+@[a-zA-Z0-9]+\S\.com$/;

exports.getAllUsers = async (req, res) => {
  const userQuery = "SELECT username, email, isActive FROM accounts";
  const grpListQuery = "SELECT DISTINCT groupname from user_groups";
  const grpListPerUserQuery = 'SELECT username, GROUP_CONCAT(groupname) AS "groups" FROM user_groups GROUP BY username';

  Promise.all([
    // Get all users info
    new Promise((resolve, reject) => {
      db.query(userQuery, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    }),
    // Get currently assigned group per username
    new Promise((resolve, reject) => {
      db.query(grpListPerUserQuery, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    }),
    // Get list of existing groups
    new Promise((resolve, reject) => {
      db.query(grpListQuery, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    })
  ])
    .then(([usersData, grpListPerUser, groupListResults]) => {
      // Reformat grpListPerUser into object, with usernames as keys & array of groups as values
      const fmt_grpListPerUser = grpListPerUser.reduce((accumulator, rowData) => {
        accumulator[rowData.username] = rowData.groups ? rowData.groups.split(",") : [];
        return accumulator;
      }, {});
      // Reformat groupListResults into an array of groupnames
      const groupList = groupListResults.map(groupRow => groupRow.groupname);
      // Send all results back
      res.json({ success: true, usersData, groupList, fmt_grpListPerUser });
    })
    .catch(err => {
      console.error("Error executing queries: ", err);
      res.status(500).json({ error: "An error occurred" });
    });
};

exports.createGroup = async (req, res) => {
  const { newGroup } = req.body;

  //Check if group already exists
  const results = await new Promise((resolve, reject) => {
    db.query("SELECT groupname FROM user_groups WHERE groupname = ?", [newGroup], (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });

  if (results.length > 0) {
    return res.json({ success: false, message: "Group already exists." });
  } else if (group_RegEx.test(newGroup)) {
    // If new group is valid
    db.query("INSERT INTO user_groups (groupname) VALUES (?)", [newGroup], error => {
      if (error) throw error;
    });
    return res.json({ success: true, message: "New group successfully added!" });
  } else {
    return res.json({ success: false, message: "Group name must be alphanumeric with or without '_'" });
  }
};

exports.createUser = async (req, res) => {
  const { newUser } = req.body;
  // Flags
  var usernameOK = false,
    pwdOK = false,
    emailOK = false;

  var usernameErrMsg = "",
    pwdErrMsg = "",
    emailErrMsg = "";

  var hashedPwd;

  // Check username
  if (username_RegEx.test(newUser.username)) {
    usernameOK = await new Promise((resolve, reject) => {
      db.query("SELECT username FROM accounts WHERE username = ?", [newUser.username], (error, results) => {
        if (error) return reject(error);
        if (results.length > 0) {
          usernameErrMsg = "User already exists";
        }
        resolve(results.length === 0); // if username does not exist
      });
    });
  } else {
    usernameErrMsg = "Username invalid";
  }

  // Check password
  if (pwd_RegEx.test(newUser.password)) {
    pwdOK = true;
  } else {
    pwdErrMsg = "Password invalid";
  }

  // Check email
  if (newUser.email.trim() === "" || email_RegEx.test(newUser.email.trim())) {
    emailOK = true;
  } else {
    emailErrMsg = "Email is not valid";
  }

  //Check flags
  if (usernameOK && pwdOK && emailOK) {
    // Hash password before insertion into db
    try {
      const salt = await bcryptJS.genSalt(10);
      hashedPwd = await bcryptJS.hash(newUser.password, salt);
    } catch (err) {
      console.error("Error:", err);
    }

    // Insert new user entry into db
    const createUserQuery = "INSERT INTO accounts (username, password, email, isActive) VALUES (?, ?, ?, ?)";
    db.query(createUserQuery, [newUser.username, hashedPwd, newUser.email.trim(), newUser.isActive], error => {
      if (error) throw error;
    });

    // If groups assigned to new user, update/insert entries into db
    const insertUsrGrpsQuery = "INSERT INTO user_groups (username, groupname) VALUES (?,?)";
    for (let i = 0; i < newUser.selectedGrps.length; i++) {
      db.query(insertUsrGrpsQuery, [newUser.username, newUser.selectedGrps[i]], error => {
        if (error) throw error;
      });
    }

    // Send success response
    return res.json({ success: true, message: "New user successfully created: " + newUser.username, createdUser: { username: newUser.username, email: newUser.email.trim(), isActive: newUser.isActive } });
  } else {
    // Send error messages here
    return res.json({ success: false, usrMsg: usernameErrMsg, pwdMsg: pwdErrMsg, emailMsg: emailErrMsg, message: "Cannot create new user." });
  }
};

exports.editUser = async (req, res) => {
  const { tempData } = req.body;
  // Error messages & hashed pwd
  let pwdErrMsg = "",
    emailErrMsg = "",
    hashedNewPwd = "";
  // Flags
  let pwdOK = false,
    emailOK = false;

  // Make sure 'admin' is not being disabled or removed from admin grp
  if (tempData.username === "admin") {
    if (!tempData.isActive) {
      return res.json({
        success: false,
        pwdErrMsg,
        emailErrMsg,
        message: "Cannot disable admin."
      });
    } else if (!tempData.selectedGrps.includes("admin")) {
      return res.json({
        success: false,
        pwdErrMsg,
        emailErrMsg,
        message: "Cannot remove admin from admin group."
      });
    }
  }

  // Check edits against current credentials
  const getUserQuery = "SELECT * FROM accounts WHERE username=?";
  const currentUser = await new Promise((resolve, reject) => {
    db.query(getUserQuery, [tempData.username], (error, results) => {
      if (error) return reject(error);
      resolve(results[0]);
    });
  });

  // Check password (consider pwd unchanged scenario)
  if (tempData.password === "") {
    pwdOK = true;
    hashedNewPwd = currentUser.password; // pwd remains the same
  } else if (pwd_RegEx.test(tempData.password)) {
    pwdOK = true;
    const salt = await bcryptJS.genSalt(10);
    hashedNewPwd = await bcryptJS.hash(tempData.password, salt); // new pwd
  } else {
    pwdErrMsg = "New password is not valid."; // invalid pwd
  }

  // Check email
  if (tempData.email.trim() === "" || email_RegEx.test(tempData.email.trim())) {
    emailOK = true;
  } else {
    emailErrMsg = "Email is not valid.";
  }

  if (pwdOK && emailOK) {
    // Update credentials
    const updateUserQuery = "UPDATE accounts SET password= ?, email =?, isActive= ? WHERE username =?";
    db.query(updateUserQuery, [hashedNewPwd, tempData.email.trim(), tempData.isActive, tempData.username], error => {
      if (error) throw error;
    });

    // Delete current group rows
    const delGrpsQuery = "DELETE FROM user_groups WHERE username = ?";
    db.query(delGrpsQuery, [tempData.username], error => {
      if (error) throw error;
    });

    // Insert reassigned groups
    const insertGrpsQuery = "INSERT INTO user_groups (username, groupname) VALUES (?,?)";
    for (let i = 0; i < tempData.selectedGrps.length; i++) {
      db.query(insertGrpsQuery, [
        tempData.username,
        tempData.selectedGrps[i],
        error => {
          if (error) throw error;
        }
      ]);
    }

    return res.json({
      success: true,
      message: "Saved user: " + tempData.username,
      updatedUser: {
        username: tempData.username,
        password: hashedNewPwd,
        email: tempData.email.trim(),
        isActive: tempData.isActive
      }
    });
  } else {
    // Send error messages
    return res.json({ success: false, pwdErrMsg, emailErrMsg, message: "Failed to update user." });
  }
};

exports.updateEmail = async (req, res) => {
  const { newEmail, currentEmail } = req.body;
  const username = req.username;

  if (newEmail === currentEmail) {
    return res.json({ success: false, message: "Please enter a new email." });
  }

  if (email_RegEx.test(newEmail) || newEmail.trim() === "") {
    const updateEmailQuery = "UPDATE accounts SET email=? WHERE username=?";
    db.query(updateEmailQuery, [newEmail, username], error => {
      if (error) throw error;
    });
    console.log("Changed email from ", currentEmail, " to ", newEmail);

    return res.json({ success: true, message: "Email updated." });
  } else {
    return res.json({ success: false, message: "Invalid email." });
  }
};

exports.updatePassword = async (req, res) => {
  const { newPwd } = req.body;
  const username = req.username;

  let hashedNewPwd = "";

  // Query DB for current password
  const checkCurrentPwdQuery = "SELECT password FROM accounts WHERE username=?";
  const pwdResult = await new Promise((resolve, reject) => {
    db.query(checkCurrentPwdQuery, [username], (error, results) => {
      if (error) {
        return reject(error);
      }
      resolve(results);
    });
  });

  // Compare password with current pwd
  const isMatch = await bcryptJS.compare(newPwd, pwdResult[0].password);

  if (isMatch) {
    return res.json({ success: false, message: "Please enter a new password." });
  } else if (pwd_RegEx.test(newPwd)) {
    try {
      // Hash password before updating db
      const salt = await bcryptJS.genSalt(10);
      hashedNewPwd = await bcryptJS.hash(newPwd, salt);
    } catch (err) {
      console.error("Error:", err);
    }

    // Update new password
    const updatePwdQuery = "UPDATE accounts SET password=? WHERE username=?";
    db.query(updatePwdQuery, [hashedNewPwd, username], error => {
      if (error) throw error;
      console.log("Password changed.");
    });
    return res.json({ success: true, message: "Password updated." });
  } else {
    return res.json({ success: false, message: "Invalid password." });
  }
};

exports.getProfile = async (req, res) => {
  // Get authenticated user
  const username = req.username;

  try {
    //Get email
    const email = await new Promise((resolve, reject) => {
      db.query("SELECT email FROM accounts WHERE username=?", [username], (error, results) => {
        if (error) {
          return reject(error); // Reject promise if error
        }
        resolve(results[0].email); // Resolve promise with query results
      });
    });

    return res.json({
      success: true,
      username,
      email
    });
  } catch (error) {
    return res.status(500).json({
      success: false
    });
  }
};
