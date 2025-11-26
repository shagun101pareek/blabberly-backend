import User from "../models/user.js";
import { generateToken } from "./authController.js";

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
