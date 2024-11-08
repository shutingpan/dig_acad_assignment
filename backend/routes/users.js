const express = require("express");
const { getAllUsers, createGroup, createUser, updateEmail, updatePassword, editUser, getProfile } = require("../controllers/adminController");
const { loginUser, logoutUser, isAuthenticatedUser, authorizedGrps, isAdmin } = require("../controllers/authController");
const { getAllApps, createApp, getAllPlans, createPlan, getTaskboard, createTask, promoteTask, updateTask, demoteTask, isPermittedAction, getPlanList, editApp, createtask, gettaskbystate, promotetask2done, validateURL, validateBodyType } = require("../controllers/tmsController");
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
router.route("/tms/editApp").post(isAuthenticatedUser, authorizedGrps("pl"), editApp);

// TMS - Plans
router.route("/tms/app/plans").post(isAuthenticatedUser, getAllPlans);
router.route("/tms/app/createPlan").post(isAuthenticatedUser, authorizedGrps("pm"), createPlan);

// TMS - Taskboard
router.route("/tms/app/taskboard").post(isAuthenticatedUser, getTaskboard);
router.route("/tms/app/task").post(isAuthenticatedUser, getPlanList);

// TMS - Task actions
router.route("/tms/app/createTask").post(isAuthenticatedUser, isPermittedAction, createTask);
router.route("/tms/app/promoteTask").post(isAuthenticatedUser, isPermittedAction, promoteTask);
router.route("/tms/app/demoteTask").post(isAuthenticatedUser, isPermittedAction, demoteTask);
router.route("/tms/app/updateTask").post(isAuthenticatedUser, isPermittedAction, updateTask);

// Assignment 3
router.use(validateURL, validateBodyType);
router.route("/createtask").post(createtask);
router.route("/gettaskbystate").post(gettaskbystate);
router.route("/promotetask2done").patch(promotetask2done);
module.exports = router;
