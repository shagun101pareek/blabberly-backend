import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chatroom",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "pdf"],
      default: "text",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    deliveredAt: {
      type: Date,
    },
    seenAt: {
      type: Date,
    },
  },
  { timestamps: true } // createdAt = sentAt
);

export default mongoose.model("Message", messageSchema);
