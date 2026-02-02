import express from "express";
import {
  createComment,
  getCommentsByPost,
  deleteComment,
} from "../controllers/comment.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Create a comment (protected)
 */
router.post("/", authMiddleware, createComment);

/**
 * Get comments for a post (public)
 */
router.get("/post/:postId", getCommentsByPost);

/**
 * Delete a comment (protected)
 */
router.delete("/:id", authMiddleware, deleteComment);

export default router;
