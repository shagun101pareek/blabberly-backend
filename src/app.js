import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import friendRequestRoutes from "./routes/friendRequestRoutes.js";
import friendshipRoutes from "./routes/friendshipRoutes.js";
import chatroomRoutes from "./routes/chatRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use("/api/users", userRoutes);

// Protected routes
app.use("/api/chat", chatRoutes);
app.use("/api/friend/requests", friendRequestRoutes);
app.use("/api/friendships", friendshipRoutes);
app.use("/api/chatrooms", chatroomRoutes);

export default app;