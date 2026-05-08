import express from "express";
import User from "../models/User.js"
import { clerkClient } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";

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
        { image: data.image_url,
          firstName: data.first_name,
          lastName: data.last_name }
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).send('Error verifying webhook')
  }
})

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

export default router;
