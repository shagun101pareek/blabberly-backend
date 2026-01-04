import User from "../models/user.js";
import { generateToken } from "./authController.js";
import FriendRequest from "../models/friendRequest.js";
import Friendship from "../models/friendships.js";

export const createUser = async (req, res) => {
  try {
    const { email, password, username, firstName, lastName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists"});
    }

    const user = await User.create({ email, password, username, firstName, lastName });

    const token = generateToken(user._id);

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Check if input is email or username
    const query = emailOrUsername.includes("@")
      ? { email: emailOrUsername.toLowerCase() }
      : { username: emailOrUsername.toLowerCase() };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        username: user.username, 
        firstName: user.firstName, 
        lastName: user.lastName 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

export const getDiscoverUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;

    // 1. Find friendships
    const friendships = await Friendship.find({
      $or: [
        { user1: loggedInUserId },
        { user2: loggedInUserId }
      ]
    });

    const friendIds = friendships.map(f =>
      f.user1.toString() === loggedInUserId
        ? f.user2.toString()
        : f.user1.toString()
    );

    // 2. Find pending friend requests (sent + received)
    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromUser: loggedInUserId, status: "pending" },
        { toUser: loggedInUserId, status: "pending" }
      ]
    });

    const pendingUserIds = pendingRequests.map(r =>
      r.fromUser.toString() === loggedInUserId
        ? r.toUser.toString()
        : r.fromUser.toString()
    );

    // 3. Exclude users
    const excludedUserIds = [
      loggedInUserId,
      ...friendIds,
      ...pendingUserIds
    ];

    // 4. Get discoverable users
    const users = await User.find({
      _id: { $nin: excludedUserIds }
    }).select("_id username firstName lastName");

    res.status(200).json(users);

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

  export const searchUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const searchQuery = req.query.q;

    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(200).json([]);
    }

    // 1. Find friendships
    const friendships = await Friendship.find({
      $or: [
        { user1: loggedInUserId },
        { user2: loggedInUserId }
      ]
    });

    const friendIds = friendships.map(f =>
      f.user1.toString() === loggedInUserId
        ? f.user2.toString()
        : f.user1.toString()
    );

    // 2. Find pending friend requests
    const pendingRequests = await FriendRequest.find({
      $or: [
        { fromUser: loggedInUserId, status: "pending" },
        { toUser: loggedInUserId, status: "pending" }
      ]
    });

    const pendingUserIds = pendingRequests.map(r =>
      r.fromUser.toString() === loggedInUserId
        ? r.toUser.toString()
        : r.fromUser.toString()
    );

    // 3. Exclude users
    const excludedUserIds = [
      loggedInUserId,
      ...friendIds,
      ...pendingUserIds
    ];

    // 4. Search users
    const users = await User.find({
      _id: { $nin: excludedUserIds },
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { firstName: { $regex: searchQuery, $options: "i" } },
        { lastName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } }
      ]
    })
      .select("_id username firstName lastName")
      .limit(10);

    res.status(200).json(users);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profileImage = `/uploads/profile-pics/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      profileImage: user.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

