import express from "express";
import { getUserStatus } from "../controllers/userStatusController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:id/status", protect, getUserStatus);

export default router;
