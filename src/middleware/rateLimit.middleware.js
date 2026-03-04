import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, try again later"
});

export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many analytics events, try again later",
});
