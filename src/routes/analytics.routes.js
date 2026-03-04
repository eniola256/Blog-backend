import express from "express";
import { trackEvent } from "../controllers/analytics.controller.js";
import { analyticsLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/events", analyticsLimiter, trackEvent);

export default router;
