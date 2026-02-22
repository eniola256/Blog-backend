import Subscriber from "../models/Subscriber.js";
import { sendWelcomeEmail } from "../utils/emailService.js";

/**
 * Subscribe to newsletter
 */
export const subscribe = async (req, res) => {
  console.log("🔔 Subscribe endpoint hit");
  console.log("   Request body:", req.body);
  
  try {
    const { email } = req.body;

    if (!email) {
      console.log("❌ No email provided");
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("📧 Processing subscription for:", email);

    // Check if email already exists
    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });

    if (existingSubscriber) {
      console.log("   Email already exists in database");
      
      // If previously unsubscribed, resubscribe them
      if (!existingSubscriber.isSubscribed) {
        console.log("   Resubscribing previously unsubscribed user");
        existingSubscriber.isSubscribed = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();

        // Send welcome email
        console.log("   Attempting to send welcome email...");
        try {
          await sendWelcomeEmail(email);
          console.log("   ✅ Welcome email sent successfully");
        } catch (emailError) {
          console.error("   ❌ Failed to send welcome email:", emailError.message);
          console.error("   Full error:", emailError);
        }

        return res.json({
          message: "Successfully resubscribed!",
          subscriber: existingSubscriber,
        });
      }

      console.log("   User already subscribed");
      return res.status(400).json({ message: "Email is already subscribed" });
    }

    // Create new subscriber
    console.log("   Creating new subscriber...");
    const subscriber = await Subscriber.create({
      email: email.toLowerCase(),
    });
    console.log("   ✅ Subscriber created:", subscriber._id);

    // Send welcome email
    console.log("   Attempting to send welcome email...");
    try {
      await sendWelcomeEmail(email);
      console.log("   ✅ Welcome email sent successfully");
    } catch (emailError) {
      console.error("   ❌ Failed to send welcome email:", emailError.message);
      console.error("   Full error:", emailError);
    }

    res.status(201).json({
      message: "Successfully subscribed!",
      subscriber,
    });
  } catch (error) {
    console.error("❌ Subscription error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Unsubscribe from newsletter
 */
export const unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const subscriber = await Subscriber.findOne({ email: email.toLowerCase() });

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }

    if (!subscriber.isSubscribed) {
      return res.status(400).json({ message: "Already unsubscribed" });
    }

    subscriber.isSubscribed = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({ message: "Successfully unsubscribed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all subscribers (admin only)
 */
export const getAllSubscribers = async (req, res) => {
  try {
    const { page = 1, limit = 10, active } = req.query;

    const query = {};
    if (active === "true") {
      query.isSubscribed = true;
    } else if (active === "false") {
      query.isSubscribed = false;
    }

    const subscribers = await Subscriber.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Subscriber.countDocuments(query);

    res.json({
      subscribers,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete subscriber (admin only)
 */
export const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await Subscriber.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }

    res.json({ message: "Subscriber deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
