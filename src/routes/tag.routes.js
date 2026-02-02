import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import {
  createTag,
  getAllTags,
  deleteTag,
  getTagBySlug
} from "../controllers/tag.controller.js";

const router = express.Router();

// PUBLIC – anyone can see tags
router.get("/", getAllTags);

// routes/tag.routes.js - ADD THIS ROUTE
router.get("/:slug", getTagBySlug); // ✅ ADD THIS before /:id route

// PROTECTED – must be logged in
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin", "author"),
  createTag
);



// ADMIN ONLY
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteTag
);
export default router;
