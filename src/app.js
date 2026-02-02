import express from "express";
import authRoutes from "./routes/auth.routes.js";
import authMiddleware from "./middleware/auth.middleware.js";
import authorizeRoles from "./middleware/role.middleware.js";
import postRoutes from "./routes/post.routes.js";
import postPublicRoutes from './routes/postPublicRoutes.js';
import tagRoutes from "./routes/tag.routes.js";
import helmet from "helmet";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import categoryRoutes from "./routes/category.routes.js";
import categoryPublicRoutes from "./routes/categoryPublic.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import cors from "cors";
import tagPublicRoutes from "./routes/tagPublic.routes.js";



const app = express();

app.use(cors());

app.use(express.json());
app.use(helmet());
app.use("/api", apiLimiter);
app.use("/api/comments", commentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/public/posts", postPublicRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/public/categories", categoryPublicRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/public/tags", tagPublicRoutes);




app.get("/", (req, res) => {
  res.send("Blog API running");
});

app.get(
  "/api/admin-only",
  authMiddleware,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({ message: "Admin access granted" });
  }
);

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "Access granted",
    user: req.user,
  });
});

app.get(
  "/api/author-only",
  authMiddleware,
  authorizeRoles("author", "admin"),
  (req, res) => {
    res.json({ message: "Author access granted" });
  }
);

app.use(errorHandler);

export default app;
