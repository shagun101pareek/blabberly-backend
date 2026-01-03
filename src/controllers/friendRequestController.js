import FriendRequest from "../models/friendRequest.js";
import Friendship from "../models/friendships.js";
import { createChatRoom } from "./ChatRoomController.js";

/**
 * SEND FRIEND REQUEST
 */
export const sendFriendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.user.id; // set by auth middleware

    // prevent duplicate pending requests
    const existingRequest = await FriendRequest.findOne({
      fromUser: fromUserId,
      toUser: toUserId,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Friend request already sent" });
    }

    const friendRequest = new FriendRequest({
      fromUser: fromUserId,
      toUser: toUserId,
    });

    await friendRequest.save();

    res.status(201).json({
      message: "Friend request sent",
      friendRequest,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * GET ALL PENDING FRIEND REQUESTS
 */
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.find({
      toUser: userId,
      status: "pending",
    }).populate("fromUser", "username email");

    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * ACCEPT FRIEND REQUEST
 * FLOW:
 * 1. Mark request as accepted
 * 2. Create friendship (if not exists)
 * 3. Create chatroom (participants array)
 */
export const acceptFriendRequest = async (req, res) => {
  console.log("ACCEPT FRIEND REQUEST API HIT");

  try {
    const request = await FriendRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // mark request as accepted
    request.status = "accepted";
    await request.save();

    // create friendship if not already present
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1: request.fromUser, user2: request.toUser },
        { user1: request.toUser, user2: request.fromUser },
      ],
    });

    if (!existingFriendship) {
      await Friendship.create({
        user1: request.fromUser,
        user2: request.toUser,
      });
    }

    // ✅ CREATE CHATROOM (ARRAY-BASED → GROUP READY)
    await createChatRoom([request.fromUser, request.toUser]);

    return res.status(200).json({
      message: "Friend request accepted",
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({
      message: "Error accepting request",
      error: error.message,
    });
  }
};
