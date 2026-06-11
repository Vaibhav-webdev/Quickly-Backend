// models/FriendRequest.js

import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema({
  sender: {
    type: String,
    ref: "User",
  },

  receiver: {
    type: String,
    ref: "User",
  },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
});

// ES6 Default Export
export default mongoose.model("FriendRequest", friendRequestSchema);