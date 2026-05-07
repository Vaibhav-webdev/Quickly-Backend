import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,  // ← duplicate user kabhi nahi banega
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    notification : {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true } // ← createdAt, updatedAt auto mil jayega
);

export default mongoose.model("User", userSchema);