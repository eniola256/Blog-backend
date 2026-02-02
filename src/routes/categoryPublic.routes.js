import express from "express";
import {
  getPublicCategories,
  getCategoryWithPosts
} from "../controllers/categoryPublic.controller.js";

const router = express.Router();

router.get("/", getPublicCategories);
router.get("/:slug", getCategoryWithPosts);

export default router;

