import express from 'express';
import { sendFriendRequest, getPendingRequests, acceptFriendRequest } from '../controllers/friendRequestController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/send', sendFriendRequest);
router.get('/pending', getPendingRequests);
router.put('/accept/:id', acceptFriendRequest);

export default router;