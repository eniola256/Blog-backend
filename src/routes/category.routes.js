import express from "express";
import { createCategory, getCategories,
  updateCategory, getCategoryBySlug,
  deleteCategory
 } from "../controllers/category.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug); // ✅ ADD THIS ROUTE
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  createCategory
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  updateCategory
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  deleteCategory
);

export default router;
