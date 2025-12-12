import FriendRequest from '../models/friendRequest.js';

export const sendFriendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.user; // from auth middleware (already the ID string)

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    const friendRequest = new FriendRequest({
      fromUser: fromUserId,
      toUser: toUserId
    });

    await friendRequest.save();
    res.status(201).json({ message: 'Friend request sent', friendRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user;
    
    const requests = await FriendRequest.find({
      toUser: userId,
      status: 'pending'
    }).populate('fromUser', 'username email');

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
