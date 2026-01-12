import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessagesByChatroom,
  markMessagesSeen,
  markChatAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/send", sendMessage);
router.get("/:chatroomId", getMessagesByChatroom);
router.put("/seen", markMessagesSeen);
router.put("/read", markChatAsRead);

export default router;
