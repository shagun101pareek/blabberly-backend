import express from "express";
import { createUser } from "../controllers/userController.js";
import { loginUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/create", createUser);
router.post("/login", loginUser);


export default router;
