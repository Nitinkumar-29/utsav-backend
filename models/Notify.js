const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: String,
    required: true,
  },
  emailAddress: {
    type: String,
    required: true,
  },
  functionDate: {
    type: String,
    required: true,
  },
  functionTime: {
    type: String,
    required: true,
  },
  functionType: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
