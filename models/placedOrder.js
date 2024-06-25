const mongoose = require("mongoose");
const { Schema } = mongoose;

const venueBookSchema = new Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: Number,
    required: true,
  },
  pincode: {
    type: Number,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  guests: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  orderPlaced: {
    type: Boolean,
    default: false,
  },
});
const bookVenue = mongoose.model("bookVenue", venueBookSchema);
module.exports = bookVenue;
