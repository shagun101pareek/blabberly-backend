import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessagesByChatroom,
  markMessagesSeen,
  markChatAsRead,
  uploadFileMessage,
} from "../controllers/messageController.js";
import messageUpload from "../middleware/messageUploadMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/send", sendMessage);
router.post("/upload", messageUpload.single("file"), uploadFileMessage);
router.get("/:chatroomId", getMessagesByChatroom);
router.put("/seen", markMessagesSeen);
router.put("/read", markChatAsRead);

export default router;
