import express from "express";
import { register, login } from "../controllers/auth.controller.js";
import { notifySubscribersAboutPost } from "../controllers/admin.controller.js";


const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/posts/:id/notify", notifySubscribersAboutPost);

export default router;
