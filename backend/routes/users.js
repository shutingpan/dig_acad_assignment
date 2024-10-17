const express = require("express");
const { getAllUsers, createGroup, createUser, updateEmail, updatePassword, editUser, getProfile } = require("../controllers/adminController");
const { loginUser, logoutUser, isAuthenticatedUser, authorizedGrps, isAdmin } = require("../controllers/authController");
const { getAllApps, createApp, getAppDetails, getAllPlans, createPlan, getTaskboard, createTask, getTask, promoteTask, updateTask, demoteTask, isPermittedAction } = require("../controllers/tmsController");
const router = express.Router();

// Check admin status
router.route("/isAdmin").get(isAuthenticatedUser, isAdmin);

// Admin
router.route("/ums").get(isAuthenticatedUser, authorizedGrps("admin"), getAllUsers);
router.route("/ums/createGroup").post(isAuthenticatedUser, authorizedGrps("admin"), createGroup);
router.route("/ums/createUser").post(isAuthenticatedUser, authorizedGrps("admin"), createUser);
router.route("/ums/editUser").put(isAuthenticatedUser, authorizedGrps("admin"), editUser);

// Individual user
router.route("/login").post(loginUser, isAuthenticatedUser);
router.route("/logout").post(isAuthenticatedUser, logoutUser);
router.route("/profile").get(isAuthenticatedUser, getProfile);
router.route("/profile/updateEmail").put(isAuthenticatedUser, updateEmail);
router.route("/profile/updatePassword").put(isAuthenticatedUser, updatePassword);

// TMS - Apps
router.route("/tms").get(isAuthenticatedUser, getAllApps);
router.route("/tms/createApp").post(isAuthenticatedUser, authorizedGrps("pl"), createApp);
router.route("/tms/app").post(isAuthenticatedUser, getAppDetails);

// TMS - Plans
router.route("/tms/plans").post(isAuthenticatedUser, getAllPlans);
router.route("/tms/createPlan").post(isAuthenticatedUser, authorizedGrps("pm"), createPlan);

// TMS - Taskboard
router.route("/tms/getTaskboard").post(isAuthenticatedUser, getTaskboard); // appName data sent
router.route("/tms/getTask").post(isAuthenticatedUser, getTask);

// TMS - Task actions
// Based on app-permits: block ability to view action (FE) & perform action (BE)
router.route("/tms/createTask").post(isAuthenticatedUser, isPermittedAction, createTask);
router.route("/tms/promoteTask").post(isAuthenticatedUser, isPermittedAction, promoteTask);
router.route("/tms/demoteTask").post(isAuthenticatedUser, isPermittedAction, demoteTask);
router.route("/tms/updateTask").post(isAuthenticatedUser, isPermittedAction, updateTask);

module.exports = router;
