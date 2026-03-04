import mongoose from "mongoose";

export const ANALYTICS_EVENTS = [
  "blog_home_view",
  "post_view",
  "read_25",
  "read_50",
  "read_75",
  "read_100",
  "read_complete",
  "session_start",
  "session_end",
];

const analyticsEventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      enum: ANALYTICS_EVENTS,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true,
    },
    slug: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    path: {
      type: String,
      default: null,
      trim: true,
    },
    referrer: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
    },
    ipHash: {
      type: String,
      default: null,
      index: true,
    },
    dedupeKey: {
      type: String,
      default: null,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ eventName: 1, occurredAt: -1 });
analyticsEventSchema.index({ postId: 1, occurredAt: -1 });
analyticsEventSchema.index({ sessionId: 1, occurredAt: -1 });
analyticsEventSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
