import express from "express";
import {
  createComment,
  getCommentsByPost,
  deleteComment,
  updateComment,
} from "../controllers/comment.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createCommentValidator,
  updateCommentValidator,
} from "../Validator/comment.validator.js";

const router = express.Router();

/**
 * Create a comment (protected)
 */
router.post("/", authMiddleware, createCommentValidator, validateRequest, createComment);

/**
 * Get comments for a post (public)
 */
router.get("/post/:postId", getCommentsByPost);

/**
 * Update a comment (protected - owner only)
 */
router.put("/:id", authMiddleware, updateCommentValidator, validateRequest, updateComment);

/**
 * Delete a comment (protected)
 */
router.delete("/:id", authMiddleware, deleteComment);

export default router;
