import { body } from "express-validator";

const isDraftRequest = (req) => {
  const rawStatus = req.body?.targetStatus ?? req.body?.status;
  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.trim() === "draft";
  }
  return req.body?.auto === true || req.body?.auto === "true";
};

export const createPostValidator = [
  body("title")
    .if((value, { req }) => !isDraftRequest(req))
    .trim()
    .notEmpty()
    .withMessage("Title is required"),
  body("content")
    .if((value, { req }) => !isDraftRequest(req))
    .trim()
    .notEmpty()
    .withMessage("Content is required"),
  body("slug")
    .optional({ checkFalsy: true })
    .isSlug()
    .withMessage("Invalid slug"),
];
