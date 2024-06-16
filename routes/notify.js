const express = require("express");
const twilio = require("twilio");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const fetchUser = require("../middleware/fetchUser");
require("dotenv").config();
const User = require("../models/User");
const Notification = require("../models/Notify");

const account_sid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = twilio(account_sid, authToken);

// send whatsapp message
router.post(
  "/send-sms",
  [
    body("fullName", "Enter your full name").isLength({ min: 5 }),
    body("emailAddress", "Enter email adress").exists(),
    body("contactNumber", "Enter your mobile number"),
    body("functionDate", "Enter the date"),
    body("functionTime", "Choose function time day or evening"),
    body("functionType", "Choose fuction type prewedding or wedding"),
  ],
  async (req, res) => {
    const {
      fullName,
      emailAddress,
      contactNumber,
      functionDate,
      functionTime,
      functionType,
    } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const mobileNumber = contactNumber;
    const message = `Hello ${fullName} from utsav, We received your request to check availablity for this hotel:, As you mentioned the details for your  ${functionType} function on date ${functionDate} in ${functionTime} and we would like you to know that hotel book is available as your requirement and can be booked between 12-2-24 to 12-3-24 `;
    try {
      await client.messages.create({
        body: message,
        from: "+12513179603",
        to: `+91${mobileNumber}`,
      });
      res.json({ success: true, message });
      console.log(message);
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  }
);

router.post(
  "/send-sms-vendor-details",
  [
    body("fullName", "enter your full name"),
    body("mobileNumber", "enter your mobile number"),
  ],
  async (req, res) => {
    const { fullName, mobileNumber } = req.body;
    try {
      await client.messages.create({
        body: `<html></html>`,
        from: "+12513179603",
        to: `+91${mobileNumber}`,
      });
      res.json({ success: true, message: "sent details on mobile number" });
    } catch (error) {
      console.error(error.message);
    }
  }
);
module.exports = router;
