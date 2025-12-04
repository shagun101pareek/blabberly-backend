
import express from "express";
import {
  createFriendship,
  getFriendships,
  deleteFriendship
} from "../controllers/friendshipsController.js";

const router = express.Router();

// Create friendship
router.post("/", createFriendship);

// Get all friendships of a given user
router.get("/:userId", getFriendships);

// Delete friendship
router.delete("/", deleteFriendship);

export default router;
