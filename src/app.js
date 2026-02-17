import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';
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
import adminRoutes from "./routes/admin.routes.js";

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

app.set('trust proxy', 1);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
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
app.use("/api/admin", adminRoutes);

// ... rest of your app.js




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
