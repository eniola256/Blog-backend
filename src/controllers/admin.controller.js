import Post from "../models/Post.js";
import Category from "../models/category.js";
import Tag from "../models/tag.model.js";
import mongoose from "mongoose";
import slugify from "slugify";
import { notifySubscribers } from "../utils/emailService.js";
import Subscriber from "../models/Subscriber.js";
import AnalyticsEvent from "../models/analyticsEvent.model.js";
import { uploadImage, deleteImage } from "../utils/cloudinary.js";

const resolveStatus = (body, fallback = "draft") => {
  const rawStatus = body?.targetStatus ?? body?.status;
  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.trim();
  }
  return fallback;
};

const isPublishedStatus = (status) => status === "published";
const parseBoolean = (value) => value === true || value === "true";

// ========== CATEGORIES CRUD ==========

// GET /api/admin/categories - Get all categories with postCount
export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const postCount = await Post.countDocuments({ category: category._id });
        return {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description || "",
          postCount,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    console.error('GET CATEGORIES ERROR:', error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// POST /api/admin/categories - Create category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const categorySlug = slugify(name, { lower: true, strict: true });

    const exists = await Category.findOne({ 
      $or: [
        { slug: categorySlug },
        { name: name.trim() }
      ]
    });
    
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = new Category({ 
      name: name.trim(), 
      slug: categorySlug,
      description: description || ""
    });
    
    await category.save();

    res.status(201).json({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: 0,
    });
  } catch (error) {
    console.error('CREATE CATEGORY ERROR:', error);
    res.status(500).json({ message: error.message || "Failed to create category" });
  }
};

// POST /api/admin/categories/bulk - Create multiple categories
export const createCategoriesBatch = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ message: "Categories array is required" });
    }

    const results = [];
    const errors = [];

    for (const cat of categories) {
      try {
        const categorySlug = cat.slug || slugify(cat.name, { lower: true, strict: true });
        const exists = await Category.findOne({ slug: categorySlug });

        if (!exists) {
          const created = await Category.create({
            name: cat.name,
            slug: categorySlug,
            description: cat.description || "" 
          });
          results.push(created);
        } else {
          errors.push(`${cat.name} already exists`);
        }
      } catch (err) {
        errors.push(`Failed to create ${cat.name}: ${err.message}`);
      }
    }

    res.status(201).json({
      success: true,
      created: results,
      errors,
    });
  } catch (error) {
    console.error('BULK CREATE ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/categories/:id - Update category
export const updateCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (slug) {
      category.slug = slug;
    } else if (name) {
      category.slug = slugify(name, { lower: true, strict: true });
    }

    await category.save();

    const postCount = await Post.countDocuments({ category: category._id });

    res.json({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount,
    });
  } catch (error) {
    console.error('UPDATE CATEGORY ERROR:', error);
    res.status(500).json({ message: error.message || "Failed to update category" });
  }
};

// DELETE /api/admin/categories/:id - Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const postCount = await Post.countDocuments({ category: id });
    if (postCount > 0) {
      return res.status(400).json({
        message: "Cannot delete category with posts",
        postCount,
      });
    }

    await category.deleteOne();

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error('DELETE CATEGORY ERROR:', error);
    res.status(500).json({ message: error.message || "Failed to delete category" });
  }
};

// ========== TAGS CRUD ==========

// GET /api/admin/tags - Get all tags with postCount
export const getAdminTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });

    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => {
        const postCount = await Post.countDocuments({ tags: tag._id });
        return {
          _id: tag._id,
          name: tag.name,
          slug: tag.slug,
          postCount,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt,
        };
      })
    );

    res.json(tagsWithCount);
  } catch (error) {
    console.error('GET TAGS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/tags - Create tag
export const createTag = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const existing = await Tag.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "Tag already exists" });
    }

    const tag = await Tag.create({ name });

    res.status(201).json({
      _id: tag._id,
      name: tag.name,
      slug: tag.slug,
      postCount: 0,
    });
  } catch (error) {
    console.error('CREATE TAG ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/tags/:id - Update tag
export const updateTag = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid tag ID" });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    if (name) {
      tag.name = name;
      tag.slug = slugify(name, { lower: true, strict: true });
    }

    await tag.save();

    const postCount = await Post.countDocuments({ tags: tag._id });

    res.json({
      _id: tag._id,
      name: tag.name,
      slug: tag.slug,
      postCount,
    });
  } catch (error) {
    console.error('UPDATE TAG ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/tags/:id - Delete tag
export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid tag ID" });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    await tag.deleteOne();

    res.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error('DELETE TAG ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// ========== POSTS ADMIN ==========

// Normalize tag inputs to tag IDs (creates missing tags by name)
const normalizeTags = async (tags = []) => {
  if (!Array.isArray(tags)) {
    throw new Error("Tags must be an array");
  }
  if (tags.length === 0) return [];

  const tagIds = [];
  const tagNames = new Set();

  for (const tag of tags) {
    if (mongoose.Types.ObjectId.isValid(tag)) {
      tagIds.push(String(tag));
    } else if (typeof tag === "string" && tag.trim()) {
      tagNames.add(tag.trim().toLowerCase());
    } else {
      throw new Error("Invalid tag value");
    }
  }

  if (tagIds.length > 0) {
    const existingTagsCount = await Tag.countDocuments({ _id: { $in: tagIds } });
    if (existingTagsCount !== tagIds.length) {
      throw new Error("One or more tags do not exist");
    }
  }

  const normalizedIds = [...tagIds];

  for (const name of tagNames) {
    const existing = await Tag.findOne({ name });
    if (existing) {
      normalizedIds.push(String(existing._id));
    } else {
      const created = await Tag.create({ name });
      normalizedIds.push(String(created._id));
    }
  }

  return [...new Set(normalizedIds)];
};

// GET /api/admin/posts - Get all posts for admin (including drafts)
export const getAdminPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.revisionOf) {
      filter.revisionOf = req.query.revisionOf === "null" ? null : req.query.revisionOf;
    }
    if (req.query.author) {
      filter.author = req.query.author;
    }

    const posts = await Post.find(filter)
      .populate("author", "name email")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(filter);

    res.json({
      page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts,
    });
  } catch (error) {
    console.error('GET POSTS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/posts/:id - Get single post by ID
export const getAdminPostById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(id)
      .populate("author", "name email")
      .populate("category", "name slug")
      .populate("tags", "name slug");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error('GET POST ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/posts - Create post
export const createPost = async (req, res) => {
  try {
    const { title, content, slug, category, metaDescription, focusKeyword } = req.body;
    const status = resolveStatus(req.body, "draft");
    const isPublishing = isPublishedStatus(status);

    let tags = req.body.tags;
    if (tags !== undefined) {
      if (typeof tags === "string") tags = tags ? [tags] : [];
      else if (!Array.isArray(tags)) tags = [];
    } else {
      tags = [];
    }

    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedContent = typeof content === "string" ? content.trim() : "";
    let normalizedCategory = typeof category === "string" ? category.trim() : category;
    if (normalizedCategory === "") {
      normalizedCategory = undefined;
    }

    if (isPublishing && (!normalizedTitle || !normalizedContent || !normalizedCategory)) {
      return res.status(400).json({
        message: "Title, content, and category are required to publish",
      });
    }

    if (normalizedCategory) {
      if (!mongoose.Types.ObjectId.isValid(normalizedCategory)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const categoryExists = await Category.findById(normalizedCategory);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" });
      }
    }

    if (tags && tags.length > 0) {
      tags = await normalizeTags(tags);
    }

    const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
    const postSlug = normalizedSlug
      ? slugify(normalizedSlug, { lower: true, strict: true })
      : (normalizedTitle ? slugify(normalizedTitle, { lower: true, strict: true }) : undefined);

    if (postSlug) {
      const existingPost = await Post.findOne({ slug: postSlug });
      if (existingPost) {
        return res.status(409).json({ message: "A post with this slug already exists" });
      }
    }

    let featuredImage = null;
    if (req.file) {
      const base64Image = req.file.buffer.toString("base64");
      featuredImage = `data:${req.file.mimetype};base64,${base64Image}`;
    } else if (typeof req.body.featuredImage === "string" && req.body.featuredImage.trim()) {
      featuredImage = req.body.featuredImage.trim();
    } else if (typeof req.body.image === "string" && req.body.image.trim()) {
      featuredImage = req.body.image.trim();
    }

    const resolvedFeaturedImage = featuredImage ? await uploadImage(featuredImage) : null;

    const post = await Post.create({
      title,
      content,
      slug: postSlug,
      category: normalizedCategory || undefined,
      tags,
      status,
      featuredImage: resolvedFeaturedImage,
      metaDescription: typeof metaDescription === "string" ? metaDescription : undefined,
      focusKeyword: typeof focusKeyword === "string" ? focusKeyword : undefined,
      author: req.user._id,
    });

    await post.populate("author", "name email");
    await post.populate("category", "name slug");
    await post.populate("tags", "name slug");

    // ============ NEW: Notify subscribers if published ============
    if (post.status === "published") {
      console.log("📧 Post is published, preparing to notify subscribers...");
      
      try {
        const subscribers = await Subscriber.find({ isSubscribed: true });
        const emails = subscribers.map(sub => sub.email);
        
        if (emails.length > 0) {
          console.log(`📧 Notifying ${emails.length} subscribers`);
          
          // Send notifications in background (don't wait for it)
          notifySubscribers(post, emails).catch(err => {
            console.error("❌ Failed to notify subscribers:", err);
          });
          
          console.log("✅ Notification emails queued");
        } else {
          console.log("ℹ️ No subscribers to notify");
        }
      } catch (notifyError) {
        // Don't fail the post creation if email fails
        console.error("❌ Error preparing notifications:", notifyError);
      }
    }
    // ============================================================

    res.status(201).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    res.status(500).json({ message: error.message || "Failed to create post" });
  }
};

export const notifySubscribersAboutPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findById(id)
      .populate("category", "name slug")
      .populate("tags", "name slug");
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.status !== "published") {
      return res.status(400).json({ message: "Post must be published" });
    }
    
    const subscribers = await Subscriber.find({ isSubscribed: true });
    const emails = subscribers.map(sub => sub.email);
    
    if (emails.length === 0) {
      return res.json({ message: "No subscribers to notify" });
    }
    
    await notifySubscribers(post, emails);
    
    res.json({ 
      message: `Notified ${emails.length} subscribers`,
      count: emails.length 
    });
  } catch (error) {
    console.error("NOTIFY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/posts/:id - Update post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, slug, category, metaDescription, focusKeyword } = req.body;
    const nextStatus = resolveStatus(req.body, undefined);
    const keepPublished = parseBoolean(req.body.keepPublished);
    const revisionId = req.body.revisionId || req.body.draftId;
    if (req.body.keepPublished !== undefined) delete req.body.keepPublished;
    if (req.body.revisionId !== undefined) delete req.body.revisionId;
    if (req.body.draftId !== undefined) delete req.body.draftId;

    let tags = req.body.tags;
    if (tags !== undefined) {
      if (typeof tags === "string") tags = tags ? [tags] : [];
      else if (!Array.isArray(tags)) tags = [];
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to update this post" });
    }

    const requestedStatus = nextStatus || post.status;
    const shouldCreateRevision =
      post.status === "published" && requestedStatus === "draft" && keepPublished;

    const normalizedCategory = typeof category === "string" ? category.trim() : category;
    if (normalizedCategory) {
      if (!mongoose.Types.ObjectId.isValid(normalizedCategory)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const categoryExists = await Category.findById(normalizedCategory);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" });
      }
    }

    if (tags && tags.length > 0) {
      tags = await normalizeTags(tags);
    }

    let postSlug;
    if (!shouldCreateRevision) {
      const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
      postSlug = normalizedSlug || undefined;
      if (postSlug && postSlug !== post.slug) {
        postSlug = slugify(postSlug, { lower: true, strict: true });
        const existingPost = await Post.findOne({ slug: postSlug, _id: { $ne: id } });
        if (existingPost) {
          return res.status(409).json({ message: "A post with this slug already exists" });
        }
      }
      if (!postSlug && !post.slug && typeof title === "string" && title.trim()) {
        const generatedSlug = slugify(title.trim(), { lower: true, strict: true });
        const existingPost = await Post.findOne({ slug: generatedSlug, _id: { $ne: id } });
        if (existingPost) {
          return res.status(409).json({ message: "A post with this slug already exists" });
        }
        postSlug = generatedSlug;
      }
    }

    // ── Cloudinary image intent ──────────────────────────────────────────
    const shouldClearFeaturedImage =
      req.body.featuredImage === null ||
      req.body.featuredImage === "null" ||
      req.body.featuredImage === "";

    const imageIntent = (() => {
      if (req.file) {
        const base64Image = req.file.buffer.toString("base64");
        return {
          type: "set",
          value: `data:${req.file.mimetype};base64,${base64Image}`,
        };
      }

      if (shouldClearFeaturedImage) {
        return { type: "clear" };
      }

      if (typeof req.body.featuredImage === "string" && req.body.featuredImage.trim()) {
        return { type: "set", value: req.body.featuredImage.trim() };
      }

      if (typeof req.body.image === "string" && req.body.image.trim()) {
        return { type: "set", value: req.body.image.trim() };
      }

      return { type: "none" };
    })();
    // ── End image intent ────────────────────────────────────────────────

    const nextTitle = title !== undefined ? title : post.title;
    const nextContent = content !== undefined ? content : post.content;
    const nextCategory = normalizedCategory !== undefined ? normalizedCategory : post.category;

    if (shouldCreateRevision) {
      let revisionPost = null;
      if (revisionId && mongoose.Types.ObjectId.isValid(revisionId)) {
        revisionPost = await Post.findOne({
          _id: revisionId,
          revisionOf: post._id,
          status: "draft",
        });
      }
      if (!revisionPost) {
        revisionPost = await Post.findOne({
          revisionOf: post._id,
          status: "draft",
        }).sort({ updatedAt: -1 });
      }

      const revisionCurrentFeaturedImage = revisionPost ? revisionPost.featuredImage : post.featuredImage;
      let resolvedRevisionFeaturedImage = revisionCurrentFeaturedImage;

      if (imageIntent.type === "clear") {
        if (revisionCurrentFeaturedImage && revisionCurrentFeaturedImage !== post.featuredImage) {
          await deleteImage(revisionCurrentFeaturedImage);
        }
        resolvedRevisionFeaturedImage = null;
      } else if (imageIntent.type === "set") {
        const uploaded = await uploadImage(imageIntent.value);
        if (uploaded !== revisionCurrentFeaturedImage) {
          if (revisionCurrentFeaturedImage && revisionCurrentFeaturedImage !== post.featuredImage) {
            await deleteImage(revisionCurrentFeaturedImage);
          }
          resolvedRevisionFeaturedImage = uploaded;
        }
      }

      const revisionPayload = {
        title: nextTitle,
        content: nextContent,
        category: nextCategory,
        tags: tags !== undefined ? tags : post.tags,
        status: "draft",
        featuredImage: resolvedRevisionFeaturedImage,
        metaDescription: metaDescription !== undefined ? metaDescription : post.metaDescription,
        focusKeyword: focusKeyword !== undefined ? focusKeyword : post.focusKeyword,
        revisionOf: post._id,
        author: post.author,
      };

      if (!revisionPost) {
        revisionPost = await Post.create(revisionPayload);
      } else {
        Object.assign(revisionPost, revisionPayload);
        await revisionPost.save();
      }

      await revisionPost.populate("author", "name email");
      await revisionPost.populate("category", "name slug");
      await revisionPost.populate("tags", "name slug");

      return res.json({
        success: true,
        post: revisionPost,
        isRevision: true,
      });
    }

    let resolvedFeaturedImage = post.featuredImage;
    if (imageIntent.type === "clear") {
      if (post.featuredImage) await deleteImage(post.featuredImage);
      resolvedFeaturedImage = null;
    } else if (imageIntent.type === "set") {
      const uploaded = await uploadImage(imageIntent.value);
      if (uploaded !== post.featuredImage) {
        if (post.featuredImage) await deleteImage(post.featuredImage);
        resolvedFeaturedImage = uploaded;
      }
    }

    // Check if status changed from draft to published
    const wasPublished = post.status === "published";
    const resolvedStatus = requestedStatus;
    const nowPublished = resolvedStatus === "published";
    const justPublished = !wasPublished && nowPublished;

    if (nowPublished) {
      const normalizedTitle = typeof nextTitle === "string" ? nextTitle.trim() : "";
      const normalizedContent = typeof nextContent === "string" ? nextContent.trim() : "";
      if (!normalizedTitle || !normalizedContent || !nextCategory) {
        return res.status(400).json({
          message: "Title, content, and category are required to publish",
        });
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        title: nextTitle,
        content: nextContent,
        slug: postSlug || post.slug,
        category: nextCategory,
        tags: tags !== undefined ? tags : post.tags,
        status: resolvedStatus,
        featuredImage: resolvedFeaturedImage,
        metaDescription: metaDescription !== undefined ? metaDescription : post.metaDescription,
        focusKeyword: focusKeyword !== undefined ? focusKeyword : post.focusKeyword,
      },
      { new: true, runValidators: true }
    );

    await updatedPost.populate("author", "name email");
    await updatedPost.populate("category", "name slug");
    await updatedPost.populate("tags", "name slug");

    // ============ NEW: Notify subscribers if just published ============
    if (justPublished) {
      console.log("📧 Post just published, preparing to notify subscribers...");
      
      try {
        const subscribers = await Subscriber.find({ isSubscribed: true });
        const emails = subscribers.map(sub => sub.email);
        
        if (emails.length > 0) {
          console.log(`📧 Notifying ${emails.length} subscribers`);
          
          notifySubscribers(updatedPost, emails).catch(err => {
            console.error("❌ Failed to notify subscribers:", err);
          });
          
          console.log("✅ Notification emails queued");
        } else {
          console.log("ℹ️ No subscribers to notify");
        }
      } catch (notifyError) {
        console.error("❌ Error preparing notifications:", notifyError);
      }
    }
    // ===================================================================

    res.json({
      success: true,
      post: updatedPost,
    });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    res.status(500).json({ message: error.message || "Failed to update post" });
  }
};

// DELETE /api/admin/posts/:id - Delete post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (post.featuredImage) {
      const stillUsed = await Post.exists({
        _id: { $ne: post._id },
        featuredImage: post.featuredImage,
      });
      if (!stillUsed) {
        await deleteImage(post.featuredImage);
      }
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error('DELETE POST ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// ========== STATS ==========

// GET /api/admin/stats - Get dashboard stats
export const getStats = async (req, res) => {
  try {
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ status: "published" });
    const draftPosts = await Post.countDocuments({ status: "draft" });
    const categoriesCount = await Category.countDocuments();
    const tagsCount = await Tag.countDocuments();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const analyticsMatch = { occurredAt: { $gte: thirtyDaysAgo } };

    const [uniqueVisitors, postViews, readCompletes] = await Promise.all([
      AnalyticsEvent.distinct("sessionId", analyticsMatch).then((items) => items.length),
      AnalyticsEvent.countDocuments({ ...analyticsMatch, eventName: "post_view" }),
      AnalyticsEvent.countDocuments({ ...analyticsMatch, eventName: "read_complete" }),
    ]);
    const completionRate = postViews > 0 ? Number(((readCompletes / postViews) * 100).toFixed(2)) : 0;

    res.json({
      totalPosts,
      publishedPosts,
      draftPosts,
      categoriesCount,
      tagsCount,
      analytics: {
        rangeDays: 30,
        uniqueVisitors,
        postViews,
        readCompletes,
        completionRate,
      },
    });
  } catch (error) {
    console.error('GET STATS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};
