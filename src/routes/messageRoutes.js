import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessagesByChatroom,
  markMessagesSeen,
  markChatAsRead,
  uploadFileMessage,
  uploadImageMessage,
} from "../controllers/messageController.js";
import messageUpload from "../middleware/messageUploadMiddleware.js";
import imageUpload from "../middleware/imageUploadMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/send", sendMessage);
router.post("/upload", messageUpload.single("file"), uploadFileMessage);
router.post("/image", imageUpload.single("image"), uploadImageMessage);
router.get("/:chatroomId", getMessagesByChatroom);
router.put("/seen", markMessagesSeen);
router.put("/read", markChatAsRead);

export default router;
