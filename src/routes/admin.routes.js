import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminTags,
  createTag,
  updateTag,
  deleteTag,
  getAdminPosts,
  getAdminPostById,
  createPost,
  updatePost,
  deletePost,
  getStats,
} from "../controllers/admin.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// All admin routes require admin or author role
router.use(authorizeRoles("admin", "author"));

// ========== CATEGORIES ==========

// GET /api/admin/categories - Get all categories
router.get("/categories", getAdminCategories);

// POST /api/admin/categories - Create category
router.post("/categories", createCategory);

// PUT /api/admin/categories/:id - Update category
router.put("/categories/:id", updateCategory);

// DELETE /api/admin/categories/:id - Delete category
router.delete("/categories/:id", deleteCategory);

// ========== TAGS ==========

// GET /api/admin/tags - Get all tags
router.get("/tags", getAdminTags);

// POST /api/admin/tags - Create tag
router.post("/tags", createTag);

// PUT /api/admin/tags/:id - Update tag
router.put("/tags/:id", updateTag);

// DELETE /api/admin/tags/:id - Delete tag
router.delete("/tags/:id", deleteTag);

// ========== POSTS ==========

// GET /api/admin/posts - Get all posts for admin
router.get("/posts", getAdminPosts);

// GET /api/admin/posts/:id - Get single post by ID
router.get("/posts/:id", getAdminPostById);

// POST /api/admin/posts - Create post with file upload
router.post("/posts", upload.single('featuredImage'), createPost);

// PUT /api/admin/posts/:id - Update post with file upload
router.put("/posts/:id", upload.single('featuredImage'), updatePost);

// DELETE /api/admin/posts/:id - Delete post
router.delete("/posts/:id", deletePost);

// ========== STATS ==========

// GET /api/admin/stats - Get dashboard stats
router.get("/stats", getStats);

export default router;
