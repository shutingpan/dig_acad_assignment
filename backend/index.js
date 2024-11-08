// Import modules
const dotenv = require("dotenv");
const express = require("express");
// const session = require("express-session");
// const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express(); // initialize express app

// Set up environment variables
dotenv.config({ path: "./config/config.env" });
const port = process.env.PORT;

// Set up middleware
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // frontend
    credentials: true // allow credentials to be sent
  })
);
app.use(bodyParser.urlencoded({ extended: true })); // Setup the body parser to handle form submits
app.use(bodyParser.json());
// app.use(session({ secret: "super-secret" })); // Session setup

// Import all routes
const users = require("./routes/users");
app.use("/", users);

// Catch-all for undefined routes to return JSON instead of HTML
app.use((req, res) => {
  res.status(400).json({ code: "A001" });
});

// Start server
app.listen(port, () => {
  console.log(`TMS listening at http://localhost:${port}`);
});
