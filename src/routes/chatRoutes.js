import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserChatRooms } from "../controllers/ChatRoomController.js";
import { getMessages,} from "../controllers/chatController.js";

const router = express.Router();

router.use(authMiddleware);

// GET all chatrooms of logged-in user
router.get("/", getUserChatRooms);
router.get("/chatrooms/:chatroomId/messages", getMessages);
export default router;  
