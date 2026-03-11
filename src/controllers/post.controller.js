import Post from "../models/Post.js";
import slugify from "slugify";
import mongoose from "mongoose";
import Tag from "../models/tag.model.js";
import Category from "../models/category.js";
import Subscriber from "../models/Subscriber.js";
import { notifySubscribers } from "../utils/emailService.js";
import { uploadImage, deleteImage } from '../utils/cloudinary.js';

const resolveStatus = (body, fallback = "draft") => {
  const rawStatus = body?.targetStatus ?? body?.status;
  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.trim();
  }
  return fallback;
};

const isPublishedStatus = (status) => status === "published";
const parseBoolean = (value) => value === true || value === "true";

/**
 * Normalize tag inputs to tag IDs (creates missing tags by name)
 */
const normalizeTags = async (tags) => {
  if (tags === undefined || tags === null) return undefined;
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


export const createPost = async (req, res) => {
  try {
    const { title, content, slug, category, tags, featuredImage, metaDescription, focusKeyword } = req.body;
    const status = resolveStatus(req.body, "draft");
    const isPublishing = isPublishedStatus(status);

    let normalizedTags = tags;
    if (normalizedTags !== undefined) {
      if (typeof normalizedTags === "string") normalizedTags = normalizedTags ? [normalizedTags] : [];
      else if (!Array.isArray(normalizedTags)) normalizedTags = [];
    } else {
      normalizedTags = [];
    }

    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedContent = typeof content === "string" ? content.trim() : "";
    const normalizedCategory = typeof category === "string" ? category.trim() : category;

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

    let postSlug;
    const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
    if (normalizedSlug) {
      postSlug = slugify(normalizedSlug, { lower: true, strict: true });
    } else if (normalizedTitle) {
      postSlug = slugify(normalizedTitle, { lower: true, strict: true });
    }
    if (postSlug) {
      const existingPost = await Post.findOne({ slug: postSlug });
      if (existingPost) {
        return res.status(409).json({ message: "A post with this slug already exists" });
      }
    }

    normalizedTags = await normalizeTags(normalizedTags);

    // ── Cloudinary image handling ──────────────────────────────────────────
    let rawImage = null;
    if (typeof featuredImage === "string" && featuredImage.trim()) {
      rawImage = featuredImage.trim();
    } else if (typeof req.body.image === "string" && req.body.image.trim()) {
      rawImage = req.body.image.trim();
    }

    const resolvedFeaturedImage = rawImage ? await uploadImage(rawImage) : undefined;
    // ── End image handling ─────────────────────────────────────────────────

    const post = await Post.create({
      title,
      content,
      slug: postSlug,
      category: normalizedCategory || undefined,
      tags: normalizedTags,
      featuredImage: resolvedFeaturedImage,
      metaDescription: typeof metaDescription === "string" ? metaDescription : undefined,
      focusKeyword: typeof focusKeyword === "string" ? focusKeyword : undefined,
      status,
      author: req.user._id,
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error("❌ CREATE POST ERROR:", error);
    res.status(500).json({ message: error.message || "Failed to create post" });
  }
};



export const getMyPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;  // default page 1
    const limit = parseInt(req.query.limit) || 10; // default 10 posts per page
    const skip = (page - 1) * limit;

    // Find posts for this user only, sorted newest first
    const posts = await Post.find({ author: req.user._id })
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);


    const totalPosts = await Post.countDocuments({ author: req.user._id });

    res.json({
      page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your posts" });
  }
};



export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

     // ✅ Build filter object
    const filter = { status: "published" };
    
    // ✅ Filter by category if provided
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // ✅ Filter by tag if provided
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    const posts = await Post.find(filter) // ✅ Only published
      .populate("author", "name role")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter); // ✅ Count only published

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
      posts
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Ownership check
    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const nextStatus = resolveStatus(req.body, post.status);
    req.body.status = nextStatus;
    const keepPublished = parseBoolean(req.body.keepPublished);
    const revisionId = req.body.revisionId || req.body.draftId;
    if (req.body.keepPublished !== undefined) delete req.body.keepPublished;
    if (req.body.revisionId !== undefined) delete req.body.revisionId;
    if (req.body.draftId !== undefined) delete req.body.draftId;
    if (req.body.targetStatus !== undefined) delete req.body.targetStatus;
    const shouldCreateRevision =
      post.status === "published" && nextStatus === "draft" && keepPublished;

    // Normalize slug if provided
    if (!shouldCreateRevision) {
      const normalizedSlug = typeof req.body.slug === "string" ? req.body.slug.trim() : "";
      if (normalizedSlug) {
        const slugToUse = slugify(normalizedSlug, { lower: true, strict: true });
        if (slugToUse !== post.slug) {
          const existingPost = await Post.findOne({ slug: slugToUse });
          if (existingPost) {
            return res.status(409).json({ message: "A post with this slug already exists" });
          }
        }
        req.body.slug = slugToUse;
      } else if (normalizedSlug === "") {
        delete req.body.slug;
      }
    } else if (req.body.slug !== undefined) {
      delete req.body.slug;
    }

    // CATEGORY VALIDATION (only if provided)
    let normalizedCategory =
      typeof req.body.category === "string" ? req.body.category.trim() : req.body.category;
    if (normalizedCategory === "") normalizedCategory = undefined;
    if (normalizedCategory) {
      if (!mongoose.Types.ObjectId.isValid(normalizedCategory)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const categoryExists = await Category.findById(normalizedCategory);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" });
      }
      req.body.category = normalizedCategory;
    } else if (normalizedCategory === undefined) {
      delete req.body.category;
    }

    if (req.body.tags !== undefined) {
      if (typeof req.body.tags === "string") {
        req.body.tags = req.body.tags ? [req.body.tags] : [];
      } else if (!Array.isArray(req.body.tags)) {
        req.body.tags = [];
      }
      if (req.body.tags.length > 0) {
        req.body.tags = await normalizeTags(req.body.tags);
      }
    }

    // ── Cloudinary image handling ──────────────────────────────────────────
    if (typeof req.body.image === "string" && req.body.image.trim() && !req.body.featuredImage) {
      req.body.featuredImage = req.body.image.trim();
    }

    if (
      req.body.featuredImage === null ||
      req.body.featuredImage === "null" ||
      req.body.featuredImage === ""
    ) {
      // User explicitly cleared the image — delete old one from Cloudinary
      if (post.featuredImage) await deleteImage(post.featuredImage);
      req.body.featuredImage = null;
    } else if (typeof req.body.featuredImage === "string" && req.body.featuredImage.trim()) {
      const incoming = req.body.featuredImage.trim();
      const isNewImage = incoming !== post.featuredImage;

      if (isNewImage) {
        // Upload new image to Cloudinary
        req.body.featuredImage = await uploadImage(incoming);
        // Delete the old Cloudinary image (if it was one)
        if (post.featuredImage) await deleteImage(post.featuredImage);
      } else {
        // Same image — no upload needed
        delete req.body.featuredImage;
      }
    } else if (typeof req.body.featuredImage === "string" && !req.body.featuredImage.trim()) {
      delete req.body.featuredImage;
    }
    // ── End image handling ─────────────────────────────────────────────────

    const nextTitle = req.body.title !== undefined ? req.body.title : post.title;
    const nextContent = req.body.content !== undefined ? req.body.content : post.content;
    const finalCategory = normalizedCategory !== undefined ? normalizedCategory : post.category;

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

      const revisionPayload = {
        title: nextTitle,
        content: nextContent,
        category: finalCategory,
        tags: req.body.tags !== undefined ? req.body.tags : post.tags,
        status: "draft",
        // Use the already-uploaded Cloudinary URL if image was updated, else keep existing
        featuredImage: req.body.featuredImage !== undefined ? req.body.featuredImage : post.featuredImage,
        metaDescription: req.body.metaDescription !== undefined ? req.body.metaDescription : post.metaDescription,
        focusKeyword: req.body.focusKeyword !== undefined ? req.body.focusKeyword : post.focusKeyword,
        revisionOf: post._id,
        author: post.author,
      };

      if (!revisionPost) {
        revisionPost = await Post.create(revisionPayload);
      } else {
        Object.assign(revisionPost, revisionPayload);
        await revisionPost.save();
      }

      return res.status(200).json({ success: true, post: revisionPost, isRevision: true });
    }

    if (isPublishedStatus(nextStatus)) {
      const normalizedTitle = typeof nextTitle === "string" ? nextTitle.trim() : "";
      const normalizedContent = typeof nextContent === "string" ? nextContent.trim() : "";
      if (!normalizedTitle || !normalizedContent || !finalCategory) {
        return res.status(400).json({
          message: "Title, content, and category are required to publish",
        });
      }
    }

    Object.assign(post, req.body);
    await post.save();

    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Ownership check
    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed to delete this post" });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Post deleted'
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post" });
  }
};

/**
 * Toggle like on a post
 * If user has already liked, it unlikes (removes the like)
 * If user hasn't liked, it adds a like
 */
export const toggleLikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user already liked the post
    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      // Unlike: remove user from likes array
      post.likes = post.likes.filter(
        (like) => like.toString() !== userId.toString()
      );
    } else {
      // Like: add user to likes array
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      message: hasLiked ? "Post unliked" : "Post liked",
      likesCount: post.likes.length,
      hasLiked: !hasLiked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/posts/:id/publish
export const publishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Only the author or admin can publish/unpublish
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to publish/unpublish this post" });
    }

    const wasDraft = post.status === "draft";
    if (wasDraft) {
      const normalizedTitle = typeof post.title === "string" ? post.title.trim() : "";
      const normalizedContent = typeof post.content === "string" ? post.content.trim() : "";
      if (!normalizedTitle || !normalizedContent || !post.category) {
        return res.status(400).json({
          message: "Title, content, and category are required to publish"
        });
      }
    }
    
    // Toggle status
    post.status = post.status === "published" ? "draft" : "published";

    await post.save();

    // Notify subscribers when post is published (not when unpublished)
    if (wasDraft && post.status === "published") {
      try {
        const subscribers = await Subscriber.find({ isSubscribed: true }).select("email");
        const subscriberEmails = subscribers.map(s => s.email);
        
        if (subscriberEmails.length > 0) {
          // Send notifications asynchronously (don't wait for completion)
          notifySubscribers(post, subscriberEmails).catch(err => {
            console.error("Failed to notify subscribers:", err.message);
          });
        }
      } catch (notifyError) {
        console.error("Error fetching subscribers:", notifyError.message);
      }
    }

    res.status(200).json({
      success: true,
      post,
      message: `Post is now ${post.status}`
    });
  } catch (error) {
    console.error("Create post error:", error); // 👈 ADD THIS
    res.status(500).json({
      message: error.message || "Failed to create post" // 👈 SHOW REAL ERROR
    });
  }
};
