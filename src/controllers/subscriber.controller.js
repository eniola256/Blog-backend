import Subscriber from "../models/Subscriber.js";
import { sendWelcomeEmail } from "../utils/emailService.js";

/**
 * Subscribe to newsletter
 */
export const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if email already exists
    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });

    if (existingSubscriber) {
      // If previously unsubscribed, resubscribe them
      if (!existingSubscriber.isSubscribed) {
        existingSubscriber.isSubscribed = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();

        // Send welcome email
        try {
          await sendWelcomeEmail(email);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError.message);
        }

        return res.json({
          message: "Successfully resubscribed!",
          subscriber: existingSubscriber,
        });
      }

      return res.status(400).json({ message: "Email is already subscribed" });
    }

    // Create new subscriber
    const subscriber = await Subscriber.create({
      email: email.toLowerCase(),
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(email);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError.message);
    }

    res.status(201).json({
      message: "Successfully subscribed!",
      subscriber,
    });
  } catch (error) {
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
