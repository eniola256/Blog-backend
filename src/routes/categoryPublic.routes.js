import express from "express";
import {
  getPublicCategories,
  getCategoryWithPosts
} from "../controllers/categoryPublic.controller.js";

const router = express.Router();

const cacheControl = (seconds) => (req, res, next) => {
  res.set(
    "Cache-Control",
    `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`
  );
  next();
};

router.get("/", cacheControl(300), getPublicCategories);
router.get("/:slug", cacheControl(60), getCategoryWithPosts);

export default router;
