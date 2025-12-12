import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

export default FriendRequest;
