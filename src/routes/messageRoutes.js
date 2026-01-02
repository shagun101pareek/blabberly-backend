import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessagesByChatroom,
  markMessagesSeen,
} from "../controllers/messageController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/send", sendMessage);
router.get("/:chatroomId", getMessagesByChatroom);
router.put("/seen", markMessagesSeen);

export default router;
