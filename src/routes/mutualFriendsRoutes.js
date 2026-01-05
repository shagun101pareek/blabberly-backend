import express from "express";
import { getMutualFriends } from "../controllers/mutualFriendsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/:userId/mutual/:otherUserId",
  protect,
  getMutualFriends
);

export default router;
