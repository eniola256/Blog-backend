import express from "express";
import {
  createPost,
  getAllPosts,
  updatePost,
  deletePost,
  getMyPosts,
  publishPost,
  toggleLikePost,
} from "../controllers/post.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import { createPostValidator } from "../Validator/post.validator.js";
import { validateRequest } from "../middleware/validateRequest.js";


const router = express.Router();

// Public: all posts
router.get("/", getAllPosts);

// Public: toggle like on a post (requires auth)
router.post("/:id/like", authMiddleware, toggleLikePost);

// Protected: only authors & admins
router.get("/my-posts", authMiddleware, authorizeRoles("author", "admin"), getMyPosts);

router.post(
  "/",
  authMiddleware,
  authorizeRoles("author", "admin"),
  createPostValidator,
  validateRequest,
  createPost
);

router.put("/:id", authMiddleware, authorizeRoles("author", "admin"), updatePost);

router.patch("/:id/publish", authMiddleware, authorizeRoles("author", "admin"), publishPost);

router.delete("/:id", authMiddleware, authorizeRoles("author", "admin"), deletePost);

export default router;
