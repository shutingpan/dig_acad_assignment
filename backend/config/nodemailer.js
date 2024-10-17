const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config({ path: "./config/config.env" });

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email", // SMTP server
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error("Error with Nodemailer configuration:", error);
  } else {
    console.log("Nodemailer is ready to send emails.");
  }
});

module.exports = transporter;
