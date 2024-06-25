const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const fetchUser = require("../middleware/fetchUser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Reviews = require("../models/Review");
const JWT_SECRET = "utsav-application@2905";

// Create user route
router.post(
  "/createUser",
  [
    body("name", "Write your name").isLength({ min: 3 }, { max: 20 }),
    body("email", "email address should be unique").isEmail(),
    body("password", "password must be atleast 8 characters").isLength({
      min: 8,
    }),
    body("mobileNumber", "mobile number must be of 10 character"),
    body("address", "write your unique address in it"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(401).json({ errors: errors.array() });
    }
    try {
      // first check whether use exists or not with the provided email
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(404)
          .json({ error: "user already exists with this email" });
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.password, salt);
      // create User
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
        mobileNumber: req.body.mobileNumber,
        address: req.body.address,
      });

      const data = {
        user: {
          id: user.id,
          name: user.name,
        },
      };
      // create authentication token
      const authToken = jwt.sign(data, JWT_SECRET);
      res.json({ authToken });
      console.log("Account created successfully");
    } catch (error) {
      console.error(error.message);
    }
  }
);

// router: to send email verification
router.post("/sendEmail", fetchUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json("user not found");
    }
    let transporter = nodemailer.createTransport({
      host: "live.smtp.mailtrap.io",
      port: 587,
      auth: {
        user: "api",
        pass: "********c20f",
      },
    });

    const data = {
      user: {
        id: user.id,
        name: user.name,
      },
    };

    const token = jwt.sign(data, JWT_SECRET, { expiresIn: "10m" });

    const mailConfigurations = {
      from: "nimble2905@gmail",
      to: user.email,
      subject: "Email Verification",
      text: `Hi! There, You have recently visited  
        our website and entered your email. 
        Please follow the given link to verify your email 
        http://localhost:3000/verify/${token}  
        Thanks`,
    };

    transporter.sendMail(mailConfigurations, function (error, info) {
      console.log("Email Sent Successfully");
      res.json(mailConfigurations);
      console.log(info?.response);
      console.log({ user });
    });
  } catch (error) {}
});

// route 2: login using authentication
router.post(
  "/login",
  [
    body("email", "Enter your email you want to login with").isEmail(),
    body("password", "Enter password").isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(401).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json("User not found with this email");
      }
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json("Use correct credentials");
      }
      const data = {
        user: {
          id: user.id,
          name: user.name,
        },
      };
      // create auth token
      const authToken = jwt.sign(data, JWT_SECRET);
      const success = true;
      res.json({ success, authToken });
      console.log("User logged in successfully");
    } catch (error) {
      console.error(error.message);
      return res.status(500).json("Internal server error");
    }
  }
);

// route 3: get user data
router.get("/getUserData", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ errors: errors.array() });
  }
  try {
    const userId = await req.user.id;
    const user = await User.findById(userId).select("+password");
    res.send({ user });
    console.log("Fetched user details");
  } catch (error) {
    console.error(error.message);
    res.send(500).json("Internal server error");
  }
});

// route 4: update user information, will need token
router.put(
  "/updateUserData",
  [
    body("name", "Enter your name").isLength({ min: 3 }),
    body("email", "Enter your new email").isEmail(),
    body("mobileNumber", "Enter your mobile number").exists(),
    body("address", "Enter your address").exists(),
  ],
  fetchUser,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, mobileNumber, address, email } = req.body;
    const userID = req.user.id;
    try {
      const user = await User.findById(userID);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.name = name || user.name;
      user.mobileNumber = mobileNumber || user.mobileNumber;
      user.email = email || user.email;
      user.address = address || user.address;

      await user.save();
      return res.json({ user });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);    

// route 5: get all users data
router.get("/getAllUsersData", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ errors: errors.array() });
  }

  try {
    const allUsers = await User.find();
    res.json({ allUsers });
  } catch (error) {
    console.error(error.message);
    res.json("Internal server error");
  }
});

// route 6: to delete user p[']
router.delete("/deleteUser/:id", fetchUser, async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  try {
    if (!user) {
      return res.status(404).json("User not found");
    }
    await User.findByIdAndDelete(userId);
    await Reviews.deleteMany({ userId });
    res.json("Account deleted successfully");
  } catch (error) {
    console.error(error.message);
    res.status(501).json("Internal server error");
  }
});

module.exports = router;
