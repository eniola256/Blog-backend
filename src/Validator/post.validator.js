import { body } from "express-validator";

export const createPostValidator = [
  body("title").trim().notEmpty(),
  body("content").trim().notEmpty(),
  body("slug").trim().isSlug()
];