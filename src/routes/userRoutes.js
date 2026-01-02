import express from "express";
import { createUser, loginUser, getDiscoverUsers, searchUsers } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", createUser);
router.post("/login", loginUser);
router.get("/discover", protect, getDiscoverUsers);

router.get("/search", protect, searchUsers);

export default router;
