import express from "express";
import User from "../models/User.js"
import { clerkClient } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import FriendRequest from "../models/FriendRequest.js";

const router = express.Router();

router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const evt = await verifyWebhook(req)

    const { id } = evt.data
    const eventType = evt.type

    if (eventType === "user.created") {
      await User.findOneAndUpdate(
        { clerkId: evt.data.id },
        {
          clerkId: evt.data.id,
          email: evt.data.email_addresses[0]?.email_address,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          image: evt.data.image_url,
        },
        { upsert: true, new: true }
      );
    }

    if (eventType === "user.deleted") {
      await User.findOneAndDelete({ clerkId: data.id });
    }

    if (evt.type === "user.updated") {
      const data = evt.data;

      await User.findOneAndUpdate(
        { clerkId: data.id },
        {
          image: data.image_url,
          firstName: data.first_name,
          lastName: data.last_name
        }
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).send('Error verifying webhook')
  }
})

router.get("/friends/:email", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.params.email,
    })
    .populate({
      path: "friends.user" // ← Yeh sabse important hai! 'friends' array ke andar 'user' ko populate karo
    })

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user.friends);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.get("/friend-requests/:email", async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.params.email,
      status: "pending",
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    // Sare users fetch karo
    const users = await User.find();

    // Sare users bhejo
    res.json({
      success: true,
      count: users.length,
      data: users,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.post("/send-request", async (req, res) => {

  const { senderId, receiverId } = req.body;

  const already = await FriendRequest.findOne({
    sender: senderId,
    receiver: receiverId,
  });

  if (already) {
    return res.json({
      message: "Already sent",
    });
  }

  const request = await FriendRequest.create({
    sender: senderId,
    receiver: receiverId,
  });

  res.json(request);
});

router.post("/accept-request", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        message: "Friend request not found",
      });
    }

    request.status = "accepted";
    await request.save();

    const senderUser = await User.findOne({
      email: request.sender,
    });

    const receiverUser = await User.findOne({
      email: request.receiver,
    });

    if (!senderUser || !receiverUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const roomId = `room_${[senderUser._id.toString(), receiverUser._id.toString()].sort().join("_")}`;

    await User.findByIdAndUpdate(senderUser._id, {
      $push: {
        friends: { user: receiverUser._id, roomId: roomId },
      },
    });

    await User.findByIdAndUpdate(receiverUser._id, {
      $push: {
        friends: { user: senderUser._id, roomId: roomId },
      },
    });

    res.json({
      message: "Friend added",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/reject-request", async (req, res) => {

  const { requestId } = req.body;

  await FriendRequest.findByIdAndUpdate(
    requestId,
    {
      status: "rejected",
    }
  );

  res.json({
    message: "Rejected",
  });
});

router.post("/users/bulk", async (req, res) => {
  try {
    const { ids } = req.body;

    const users = await User.find({
      _id: { $in: ids }
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
