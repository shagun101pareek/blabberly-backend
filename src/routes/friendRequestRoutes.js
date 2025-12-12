import express from 'express';
import { sendFriendRequest, getPendingRequests } from '../controllers/friendRequestController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/send', sendFriendRequest);
router.get('/pending', getPendingRequests);

export default router;