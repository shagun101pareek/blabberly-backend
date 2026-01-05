import User from "../models/user.js";

export const markOnline = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    isOnline: true,
    lastSeen: new Date(),
  });
};

export const markOffline = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen: new Date(),
  });
};

export const getUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "isOnline lastSeen"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
