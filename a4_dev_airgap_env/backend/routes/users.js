const express = require("express");
const { validateURL, validateBodyType, createtask, gettaskbystate, promotetask2done } = require("../controllers/apiController");

const router = express.Router();

// APIs
router.use(validateURL, validateBodyType);
router.route("/createtask").post(createtask);
router.route("/gettaskbystate").post(gettaskbystate);
router.route("/promotetask2done").patch(promotetask2done);
module.exports = router;
