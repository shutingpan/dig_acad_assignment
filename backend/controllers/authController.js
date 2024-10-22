const db = require("../config/db");
const jwt = require("jsonwebtoken");
const bcryptJS = require("bcryptjs");

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  // Get browser type and ip address
  const browser = req.headers["user-agent"];
  const clientIp = req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  // Check if entered username in DB
  const checkExistUserQuery = "SELECT * FROM accounts WHERE username = ?";
  const userResult = await new Promise((resolve, reject) => {
    db.query(checkExistUserQuery, [username], (error, results) => {
      if (error) return reject(error);
      return resolve(results);
    });
  });

  if (userResult.length > 0) {
    // If username exists, match entered pwd & hashed pwd
    const hashedPwd = userResult[0].password;
    const isMatch = await bcryptJS.compare(password, hashedPwd);
    if (!isMatch || !userResult[0].isActive) {
      // No password match or disabled user
      return res.json({
        success: false,
        message: "Invalid credentials."
      });
    }
  } else {
    // No username exists
    return res.json({
      success: false,
      message: "Invalid credentials."
    });
  }

  sendToken(username, browser, clientIp, 200, res);
};

exports.logoutUser = async (req, res) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  res.clearCookie("token", options);

  res.json({
    success: true,
    message: "Logged out."
  });
};

// Verify token & user active status
exports.isAuthenticatedUser = async (req, res, next) => {
  let token;

  // Check for token in cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // If no token, block access
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access. No token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the decoded username to the request object
    req.username = decoded.username;
    console.log("Verified user from JWT token:" + req.username);

    const activeResult = await new Promise((resolve, reject) => {
      db.query("SELECT isActive FROM accounts WHERE username=?", [req.username], (error, results) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });

    isActive = activeResult[0].isActive;
    if (!isActive) {
      // Clear token cookie
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/"
      };
      res.clearCookie("token", options);
      // Send response
      return res.status(401).json({ message: "Unauthorised user." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Protected routes for certain groups
exports.authorizedGrps = (...groups) => {
  return async (req, res, next) => {
    const username = req.username;
    let hasAccess = false;

    // Check if user inside any of the groups given
    for (let i = 0; i < groups.length; i++) {
      hasAccess = await this.checkGroup(username, groups[i]);
      if (hasAccess) {
        break;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Not allowed access." });
    } else {
      next();
    }
  };
};

// Return admin status
exports.isAdmin = async (req, res) => {
  try {
    const isAdmin = await this.checkGroup(req.username, "admin");
    return res.json({ isAdmin });
  } catch (err) {
    console.error("Error checking admin status:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// Create and send token (in loginUser)
const sendToken = (username, browser, clientIp, statusCode, res) => {
  // Generate JWT Token
  const token = jwt.sign({ username, browser, clientIp }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  // Cookie Options
  const options = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000),
    // Make cookie HTTP-only (cannot be accessed by client JS)
    httpOnly: true,
    // Ensure cookie is sent over HTTPs in production
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  // Send token in cookie and response
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token
  });
};

// Return value to indicate if a user is in a group
exports.checkGroup = async (username, groupname) => {
  return new Promise((resolve, reject) => {
    db.query("SELECT * FROM user_groups WHERE username = ? AND groupname = ?", [username, groupname], (error, results) => {
      if (error) return reject(error);
      return resolve(results.length > 0);
    });
  });
};
