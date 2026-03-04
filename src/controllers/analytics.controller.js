import crypto from "crypto";
import mongoose from "mongoose";
import AnalyticsEvent, { ANALYTICS_EVENTS } from "../models/analyticsEvent.model.js";

const DEDUPE_EVENTS = new Set(["post_view", "read_25", "read_50", "read_75", "read_100", "read_complete"]);

const sanitizeString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const parseObjectId = (value) => {
  if (!value) return null;
  return mongoose.Types.ObjectId.isValid(value) ? value : null;
};

const parseOccurredAt = (timestamp) => {
  if (!timestamp) return new Date();
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getClientIp = (req) => {
  const forwardedFor = sanitizeString(req.headers["x-forwarded-for"]);
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return sanitizeString(req.ip) || "unknown";
};

const hashIp = (ip) => {
  const salt = process.env.ANALYTICS_IP_SALT || "set-ANALYTICS_IP_SALT";
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex");
};

const buildDedupeKey = ({ eventName, sessionId, postId, slug }) => {
  if (!DEDUPE_EVENTS.has(eventName)) return null;
  return `${eventName}:${sessionId}:${postId || slug || "global"}`;
};

export const trackEvent = async (req, res) => {
  try {
    const eventName = sanitizeString(req.body?.eventName);
    const sessionId = sanitizeString(req.body?.sessionId);

    if (!eventName || !ANALYTICS_EVENTS.includes(eventName)) {
      return res.status(400).json({ message: "Invalid eventName" });
    }

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const postIdRaw = sanitizeString(req.body?.postId);
    if (postIdRaw && !mongoose.Types.ObjectId.isValid(postIdRaw)) {
      return res.status(400).json({ message: "Invalid postId" });
    }

    const userIdRaw = sanitizeString(req.body?.userId);
    if (userIdRaw && !mongoose.Types.ObjectId.isValid(userIdRaw)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const postId = parseObjectId(postIdRaw);
    const userId = parseObjectId(userIdRaw);
    const slug = sanitizeString(req.body?.slug);
    const path = sanitizeString(req.body?.path);
    const referrer = sanitizeString(req.body?.referrer);
    const userAgent = sanitizeString(req.headers["user-agent"]);
    const occurredAt = parseOccurredAt(req.body?.timestamp);
    const ipHash = hashIp(getClientIp(req));
    const dedupeKey = buildDedupeKey({
      eventName,
      sessionId,
      postId: postId ? postId.toString() : null,
      slug,
    });

    if (dedupeKey) {
      const existing = await AnalyticsEvent.findOne({ dedupeKey }).lean();
      if (existing) {
        return res.status(202).json({ success: true, deduped: true });
      }
    }

    await AnalyticsEvent.create({
      eventName,
      postId,
      slug,
      sessionId,
      userId,
      path,
      referrer,
      userAgent,
      ipHash,
      dedupeKey,
      occurredAt,
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to track event", error: error.message });
  }
};

export const getAnalyticsOverview = async (req, res) => {
  try {
    const days = Number(req.query?.days);
    const safeDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : 30;
    const from = new Date();
    from.setDate(from.getDate() - safeDays);

    const match = { occurredAt: { $gte: from } };

    const [totalEvents, uniqueVisitors, postViews, readCompletes, readDepth, topPosts] = await Promise.all([
      AnalyticsEvent.countDocuments(match),
      AnalyticsEvent.distinct("sessionId", match).then((items) => items.length),
      AnalyticsEvent.countDocuments({ ...match, eventName: "post_view" }),
      AnalyticsEvent.countDocuments({ ...match, eventName: "read_complete" }),
      AnalyticsEvent.aggregate([
        { $match: { ...match, eventName: { $in: ["read_25", "read_50", "read_75", "read_100"] } } },
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, eventName: "post_view" } },
        {
          $group: {
            _id: { slug: "$slug", postId: "$postId" },
            views: { $sum: 1 },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const completionRate = postViews > 0 ? Number(((readCompletes / postViews) * 100).toFixed(2)) : 0;
    const depthMap = Object.fromEntries(readDepth.map((item) => [item._id, item.count]));

    return res.json({
      rangeDays: safeDays,
      totals: {
        totalEvents,
        uniqueVisitors,
        postViews,
        readCompletes,
        completionRate,
      },
      readDepth: {
        read_25: depthMap.read_25 || 0,
        read_50: depthMap.read_50 || 0,
        read_75: depthMap.read_75 || 0,
        read_100: depthMap.read_100 || 0,
      },
      topPosts: topPosts.map((item) => ({
        slug: item._id.slug || null,
        postId: item._id.postId || null,
        views: item.views,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to get analytics overview", error: error.message });
  }
};
