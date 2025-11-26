import express from "express";
import userRoutes from "./routes/userRoutes.js";
// import authRoutes from "./routes/auth.js";

const app = express();

// Middleware
app.use(express.json()); // parse JSON
// app.use(cookieParser());

// Routes
app.use("/api/users", userRoutes);
// app.use("/api/auth", authRoutes);


export default app;
