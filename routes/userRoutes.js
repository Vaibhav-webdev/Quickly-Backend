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
    .lean();

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

// router.get("/friend-requests/:email", async (req, res) => {
//   try {
//     const requests = await FriendRequest.find({
//       receiver: req.params.email,
//       status: "pending",
//     });

//     res.json(requests);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// });

// router.get("/users", async (req, res) => {
//   try {
//     // Sare users fetch karo
//     const users = await User.find();

//     // Sare users bhejo
//     res.json({
//       success: true,
//       count: users.length,
//       data: users,
//     });

//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// });

// router.post("/send-request", async (req, res) => {

//   const { senderId, receiverId } = req.body;

//   const already = await FriendRequest.findOne({
//     sender: senderId,
//     receiver: receiverId,
//   });

//   if (already) {
//     return res.json({
//       message: "Already sent",
//     });
//   }

//   const request = await FriendRequest.create({
//     sender: senderId,
//     receiver: receiverId,
//   });

//   res.json(request);
// });

// router.post("/accept-request", async (req, res) => {
//   try {
//     const { requestId } = req.body;

//     const request = await FriendRequest.findById(requestId);

//     if (!request) {
//       return res.status(404).json({
//         message: "Friend request not found",
//       });
//     }

//     request.status = "accepted";
//     await request.save();

//     const senderUser = await User.findOne({
//       email: request.sender,
//     });

//     const receiverUser = await User.findOne({
//       email: request.receiver,
//     });

//     if (!senderUser || !receiverUser) {
//       return res.status(404).json({
//         message: "User not found",
//       });
//     }

//     const roomId = `room_${[senderUser._id.toString(), receiverUser._id.toString()].sort().join("_")}`;

//     await User.findByIdAndUpdate(senderUser._id, {
//       $push: {
//         friends: { user: receiverUser._id, roomId: roomId },
//       },
//     });

//     await User.findByIdAndUpdate(receiverUser._id, {
//       $push: {
//         friends: { user: senderUser._id, roomId: roomId },
//       },
//     });

//     res.json({
//       message: "Friend added",
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       message: error.message,
//     });
//   }
// });

// router.post("/reject-request", async (req, res) => {

//   const { requestId } = req.body;

//   await FriendRequest.findByIdAndUpdate(
//     requestId,
//     {
//       status: "rejected",
//     }
//   );

//   res.json({
//     message: "Rejected",
//   });
// });

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

// ──────────────────────────────────────────────────────────────────────────
// NOTE: Ye file tumhari existing router file (jaha User aur FriendRequest
// import hote hai) me MERGE karni hai. Neeche diye routes purane
// "/send-request" aur "/accept-request" ko REPLACE karte hai, aur
// "/reject-request" + "/sent-requests/:email" naye add hue hai.
// "/users" aur "/friend-requests/:email" routes waise hi rakho, unme
// koi change nahi hai.
// ──────────────────────────────────────────────────────────────────────────

// Send a friend request.
// Fix #1: duplicate check ab dono directions check karta hai (pehle sirf
//         sender->receiver check ho raha tha, isliye accept hone ke baad
//         reverse direction se naya request bana ja sakta tha).
// Fix #2: already-friends ho to clearly bata deta hai, naya request nahi banta.
// Fix #3: agar pehle ki request "rejected" thi to usi document ko phir se
//         "pending" kar deta hai (naya document nahi banta) — isse dobara
//         invite bhejna allow ho jata hai jaisa tumne bola tha.
router.post("/send-request", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "senderId and receiverId are required" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot send a request to yourself" });
    }

    const senderUser = await User.findOne({ email: senderId });
    const receiverUser = await User.findOne({ email: receiverId });

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyFriends = senderUser.friends?.some(
      (f) => f.user.toString() === receiverUser._id.toString()
    );

    if (alreadyFriends) {
      return res.json({ message: "Already friends" });
    }

    // Check for an existing request in EITHER direction
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.json({ message: "Already sent" });
      }

      if (existing.status === "rejected") {
        // Reactivate the old request instead of creating a duplicate document
        existing.sender = senderId;
        existing.receiver = receiverId;
        existing.status = "pending";
        await existing.save();
        return res.json(existing);
      }

      // status === "accepted" but somehow not reflected in friends array (edge case)
      return res.json({ message: "Already friends" });
    }

    const request = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
    });

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
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

// Accept a friend request.
// Fix: roomId, name aur avatar ab response me wapas jaate hai taaki frontend
//      seedha "Message" button dikha sake, full refetch ki zaroorat nahi.
// Fix: agar (bug ki wajah se) is pair ke beech aur bhi pending/duplicate
//      requests ban gaye the, accept hone par wo sab cleanup ho jaate hai.
router.post("/accept-request", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    request.status = "accepted";
    await request.save();

    const senderUser = await User.findOne({ email: request.sender });
    const receiverUser = await User.findOne({ email: request.receiver });

    if (!senderUser || !receiverUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const roomId = `room_${[senderUser._id.toString(), receiverUser._id.toString()].sort().join("_")}`;

    const alreadyFriends = senderUser.friends?.some(
      (f) => f.user.toString() === receiverUser._id.toString()
    );

    if (!alreadyFriends) {
      await User.findByIdAndUpdate(senderUser._id, {
        $push: { friends: { user: receiverUser._id, roomId } },
      });
      await User.findByIdAndUpdate(receiverUser._id, {
        $push: { friends: { user: senderUser._id, roomId } },
      });
    }

    // Cleanup: agar isi pair ke beech koi aur duplicate request bani thi, hata do
    await FriendRequest.deleteMany({
      _id: { $ne: request._id },
      $or: [
        { sender: request.sender, receiver: request.receiver },
        { sender: request.receiver, receiver: request.sender },
      ],
    });

    res.json({
      message: "Friend added",
      roomId,
      name: `${senderUser.firstName} ${senderUser.lastName}`,
      avatar: senderUser.image,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Decline a friend request. Naya route — abhi tak decline ka koi backend
// support hi nahi tha.
router.post("/reject-request", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Request rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
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

// Naya route — tumne kisko invite kiya hai (pending), taaki "Invited ✓"
// state reload ke baad bhi sahi rahe (pehle ye sirf local state pe tha).
router.get("/sent-requests/:email", async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      sender: req.params.email,
      status: "pending",
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
export default router;
