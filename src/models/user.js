import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    }, 
    username: {
      type: String,
      unique: true,
      required: true,
      lowercase: true
    },
    firstName: {
      type: String,
      required: true,
      lowercase: true
    },
    lastName: {
      type: String,
      required: true,
      lowercase: true
    },
    profileImage: {
      type: String,
      default: ""
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: null
    },
    lastMessage: {
    type: String,
    default: ""
  },

  lastMessageAt: {
    type: Date
  },

  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
  },
  { timestamps: true }
);

// To hash password before saving
userSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// To compare the entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
