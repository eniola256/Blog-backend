import express from "express";
import {
  getPublicTags,
  getTagWithPosts,
} from "../controllers/tagPublicController.js";

const router = express.Router();

const cacheControl = (seconds) => (req, res, next) => {
  res.set(
    "Cache-Control",
    `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`
  );
  next();
};

router.get("/", cacheControl(300), getPublicTags);
router.get("/:slug", cacheControl(60), getTagWithPosts);

export default router;
