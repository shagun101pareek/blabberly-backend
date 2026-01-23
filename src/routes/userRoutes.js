import express from "express";
import { createUser, loginUser, getDiscoverUsers, searchUsers } from "../controllers/userController.js";
// import protect from "../middleware/authMiddleware.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserProfile } from "../controllers/userController.js";
import { getUserConnectionsCount } from "../controllers/userController.js";
import { getMyConnections } from "../controllers/userController.js";
import { updateMyProfile } from "../controllers/userController.js";

const router = express.Router();

router.post("/create", createUser);
router.post("/login", loginUser);
router.get("/discover", authMiddleware, getDiscoverUsers);

router.get("/search", authMiddleware, searchUsers);

router.get("/me/connections", authMiddleware, getMyConnections);

router.get("/:userId", authMiddleware, getUserProfile);

router.get("/:userId/connections", authMiddleware, getUserConnectionsCount);

router.put("/me/profile", authMiddleware, updateMyProfile);

export default router;
