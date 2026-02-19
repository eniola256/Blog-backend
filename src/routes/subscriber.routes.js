import express from "express";
import {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  deleteSubscriber,
} from "../controllers/subscriber.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  subscribeValidator,
  unsubscribeValidator,
} from "../Validator/subscriber.validator.js";

const router = express.Router();

/**
 * Subscribe to newsletter (public)
 */
router.post("/subscribe", subscribeValidator, validateRequest, subscribe);

/**
 * Unsubscribe from newsletter (public)
 */
router.post("/unsubscribe", unsubscribeValidator, validateRequest, unsubscribe);

/**
 * Get all subscribers (admin only)
 */
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  getAllSubscribers
);

/**
 * Delete subscriber (admin only)
 */
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteSubscriber
);

export default router;
