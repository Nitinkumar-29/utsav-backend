const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const SavedItem = require("../models/SavedItem");
const fetchUser = require("../middleware/fetchUser");
const User = require("../models/User");
const Reviews = require("../models/Review");
const errorHandler = require("../middleware/errorHandler");
const bookVenue = require("../models/placedOrder");

// saved vendor Item like venues or other subcategory particular data
router.post("/saveItem", fetchUser, async (req, res) => {
  const savedItemData = req.body;
  const userId = req.user.id;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json("Unauthorized access");
    }

    const existingSavedItem = await SavedItem.findOne({
      itemId: savedItemData.itemId,
      userId: userId,
    });
    if (existingSavedItem) {
      return res.status(409).json("Item already saved by this user");
    }

    const savedItem = new SavedItem({
      userId: userId,
      userName: user.name,
      itemId: savedItemData.itemId,
      name: savedItemData.name,
      image: savedItemData.image,
      location: savedItemData.location,
      foodCategory: savedItemData.foodCategory,
      rating: savedItemData.rating,
      itemSaved: true,
    });
    const newSavedItem = await savedItem.save();
    console.log(newSavedItem);
    res.status(201).json(newSavedItem);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Internal server error");
  }
});

// remove savedItem from database if authorised
router.delete("/removeItem/:id", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const userId = req.user.id;
    const itemId = req.params.id;

    const user = await User.findById(userId);
    if (user) {
      const savedItem = await SavedItem.findByIdAndDelete(itemId);
      if (!savedItem) {
        return res.status(400).json("Item not found");
      }
      res.status(200).json({ message: "Item removed successfully" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Internal server error");
  }
});

// fetch saved items with authentication
router.get("/getSavedItems", fetchUser, async (req, res) => {
  const userId = req.user.id;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(userId);
    if (user) {
      const allSavedItems = await SavedItem.find({ userId });
      console.log(allSavedItems);
      res.status(200).json(allSavedItems);
    } else {
      return res.status(401).json("Unauthorised access");
    }
  } catch (error) {
    res.status(500).json("Internal server error");
  }
});

// post reviews using authentication
router.post(
  "/saveReview",
  [body("itemId"), body("reviewText", "review content")],
  fetchUser,
  async (req, res) => {
    const userId = req.user.id;
    const { reviewText, itemId } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(400).json("User not found");
      }
      const existingReviews = await Reviews.findOne({ userId, itemId });
      if (existingReviews) {
        return res.status(400).json("You have already reviewed this item");
      }
      const reviewItem = new Reviews({
        userId: userId,
        reviewText: reviewText,
        itemId: itemId,
      });

      await reviewItem.save();
      console.log(reviewItem);
      res.status(201).json(reviewItem);
    } catch (error) {
      console.log(error.message);
      res.status(500).json("Internal server error");
    }
  }
);

// fetch all review data
router.get("/getAllReviews/:itemId", async (req, res) => {
  const errors = validationResult(req);
  const itemId = req.params.itemId;
  if (!errors.isEmpty()) {
    return res.status(401).json({ errors: errors.array() });
  }
  try {
    const reviews = await Reviews.aggregate([
      { $match: { itemId: parseInt(itemId) } },
      {
        $lookup: {
          from: "users", // collection to join
          localField: "userId", // field from Reviews collection
          foreignField: "_id", // field from User collection
          as: "userDetails", // output array field
        },
      },
      {
        $unwind: "$userDetails", // unwind the userDetails array
      },
      {
        $project: {
          reviewText: 1,
          itemId: 1,
          createdAt: 1,
          userName: "$userDetails.name", // project the user's name
        },
      },
    ]);
    // const reviews = await Reviews.find({ itemId }).populate('userId', 'name');

    console.log(reviews);
    res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json("Internal server error");
  }
});

// Route to check whether venue is shortlisted or not
router.get("/checkVenue/:id", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ errors: errors.array() });
  }
  const userId = req.user.id;
  const itemId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json("User not found!");
    }
    const savedItem = await SavedItem.findOne({ itemId, userId });
    if (!savedItem) {
      return res.status(404).json({ shortlisted: false, userId });
    }
    res.status(200).json({ savedItem, shortlisted: true });
  } catch (error) {
    console.error("Error checking venue shortlisted:", error);
    res.status(500).json("Internal server error");
  }
});

// delete review by id
router.delete("/deleteReview/:id", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  const reviewId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json("User not found");
    }

    const review = await Reviews.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Check if the logged-in user is the author of the review
    if (review.userId.toString() !== user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // await Reviews.findByIdAndDelete(reviewId);
    await Reviews.deleteOne({ _id: reviewId });

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Internal server error");
  }
});

// fetch all reviews posted with a user acccount
// Backend route for fetching all reviews
router.get("/fetchAllReviews", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(401).json({ errors: errors.array() });
  }

  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json("User not found!");
    }

    const allReviews = await Reviews.find({ userId }).populate(
      "userId",
      "name"
    );
    if (!allReviews || allReviews.length === 0) {
      return res.status(200).json([]); // Return an empty array if no reviews found
    }

    console.log(allReviews);
    res.status(200).json(allReviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json("Internal server error");
  }
});

// router to verify the user on booking whether he is existing user or not or do we have token or not
router.post(
  "/verifyUserBeforeBooking",
  [
    body("email").notEmpty().withMessage("user email"),
    body("mobileNumber").notEmpty().withMessage("user mobile number"),
    body("name").notEmpty().withMessage("user name"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(403).json({ errors: errors.array() });
    }

    const { email, mobileNumber, name } = req.body;
    try {
      const user = await User.findOne({ email, mobileNumber, name });
      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", email, mobileNumber, name });
      }
      return res
        .status(200)
        .json({ message: "User found", email, mobileNumber, name });
    } catch (error) {
      return res.status(500).json({ message: "Server error", error });
    }
  }
);

// book venue
router.post(
  "/bookVenue",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Invalid email"),
    body("mobileNumber").isMobilePhone().withMessage("Invalid mobile number"),
    body("pincode").notEmpty().withMessage("Pincode is required"),
    body("time").notEmpty().withMessage("Time is required"),
    // body("date").isISO8601().withMessage("Invalid date").toDate(), // Correctly parse date
    body("guests")
      .isInt({ min: 1 })
      .withMessage("Guests must be a positive integer"),
    body("address").notEmpty().withMessage("Address is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        email,
        mobileNumber,
        pincode,
        time,
        date,
        guests,
        address,
      } = req.body;

      const orderPlaced = new bookVenue({
        name,
        email,
        mobileNumber,
        pincode,
        time,
        date,
        guests,
        address,
        orderPlaced: true,
      });

      const newOrderPlaced = await orderPlaced.save();
      return res
        .status(200)
        .json({ message: "Order placed successfully", order: newOrderPlaced });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// router to fetch all bookvenue associated with a email Id
router.get("/fetchPlacedOrdersData", fetchUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(403).json({ errors: errors.array() });
  }
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const email = user.email;
    const placedOrdersData = await bookVenue.find({ email });

    res.status(200).json({ placedOrdersData: placedOrdersData || [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
