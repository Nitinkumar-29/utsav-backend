const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const SavedItem = require("../models/SavedItem");
const fetchUser = require("../middleware/fetchUser");
const User = require("../models/User");
const Reviews = require("../models/Review");
const errorHandler = require("../middleware/errorHandler");

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

module.exports = router;
