import { body } from "express-validator";

export const createCommentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Content must be between 1 and 1000 characters"),
  body("postId")
    .trim()
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid Post ID format"),
];

export const updateCommentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Content must be between 1 and 1000 characters"),
];
