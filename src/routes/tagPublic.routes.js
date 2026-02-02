import express from "express";
import {
  getPublicTags,
  getTagWithPosts,
} from "../controllers/tagPublicController.js";

const router = express.Router();

router.get("/", getPublicTags);
router.get("/:slug", getTagWithPosts);

export default router;
