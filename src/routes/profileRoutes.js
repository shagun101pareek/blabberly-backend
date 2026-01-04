import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { updateProfilePicture } from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.put(
  "/profile-picture",
  authMiddleware,
  upload.single("profileImage"),
  updateProfilePicture
);

export default router;
