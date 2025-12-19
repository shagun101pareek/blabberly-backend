import express from "express";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import friendRequestRoutes from "./routes/friendRequestRoutes.js";
import friendshipRoutes from "./routes/friendshipRoutes.js";
import cors from "cors";

const app = express();

app.use(cors());

// Middleware
app.use(express.json()); // parse JSON
// app.use(cookieParser());

// Public Routes (no authentication required)
app.use("/api/users", userRoutes); // signup

// Protected Routes (authentication required)
app.use("/api/chat", chatRoutes);
app.use("/api/friend/requests", friendRequestRoutes);
app.use("/api/friendships", friendshipRoutes);

app.use("/api/chatrooms", chatRoutes);

export default app;
