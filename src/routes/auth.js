import express from "express";
import { body } from "express-validator";
import { login } from "../controllers/authController.js";

const router = express.Router();

router.post(
  "/login",
  [
    body("emailOrUsername")
      .notEmpty()
      .withMessage("Email or username is required"),
    body("password")
    .notEmpty()
    .withMessage("Password is required"),
  ],
  login
);


export default router;
