import Post from "../models/Post.js";
import slugify from "slugify";
import mongoose from "mongoose";
import Tag from "../models/tag.model.js";
import Category from "../models/category.js";

/**
 * Validates that all tag IDs exist in the database
 */
const validateTags = async (tags = []) => {
  if (!Array.isArray(tags)) {
    throw new Error("Tags must be an array");
  }

  if (tags.length === 0) return;

  // Validate ObjectId format
  const invalidIds = tags.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    throw new Error("One or more tag IDs are invalid");
  }

  // Check existence in DB
  const existingTagsCount = await Tag.countDocuments({
    _id: { $in: tags }
  });

  if (existingTagsCount !== tags.length) {
    throw new Error("One or more tags do not exist");
  }
};


export const createPost = async (req, res) => {
  try {
    const { title, content, slug, category, tags } = req.body;

    // 1. Category must exist
    if (!category) {
      return res.status(400).json({
        message: "Category is required"
      });
    }

    const postSlug = slug || slugify(title, { lower: true, strict: true });

    // 2. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        message: "Invalid category ID"
      });
    }

    // 3. Ensure category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        message: "Category not found"
      });
    }

    const existingPost = await Post.findOne({ slug: postSlug });
    if (existingPost) {
      return res.status(409).json({
        message: "A post with this slug already exists"
      });
    }

    // Validate tags
    await validateTags(tags);  

    
    // 4. Create post (tags already validated earlier)
    const post = await Post.create({
      title,
      content,
      slug: postSlug,
      category,
      tags,
      author: req.user._id
    });

    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    console.error("❌ CREATE POST ERROR:", error); // 👈 ADD THIS LINE
    res.status(500).json({
      message: error.message || "Failed to create post" // 👈 CHANGE THIS LINE
    });
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

     // If slug is being updated, check for duplicates
    if (req.body.slug && req.body.slug !== post.slug) {
      const existingPost = await Post.findOne({ slug: req.body.slug });
      if (existingPost) {
        return res.status(409).json({
          message: "A post with this slug already exists"
        });
      }
    }
    // CATEGORY VALIDATION (only if provided)
    if (req.body.category) {
      const category = req.body.category;

      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          message: "Invalid category ID"
        });
      }

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          message: "Category not found"
        });
      }
    }
    

    Object.assign(post, req.body);
    await post.save();

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
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

    // Toggle status
    post.status = post.status === "published" ? "draft" : "published";

    await post.save();

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
