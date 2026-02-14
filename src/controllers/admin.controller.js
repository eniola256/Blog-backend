import Post from "../models/Post.js";
import Category from "../models/category.js";
import Tag from "../models/tag.model.js";
import mongoose from "mongoose";
import slugify from "slugify";

// ========== CATEGORIES CRUD ==========

// GET /api/admin/categories - Get all categories with postCount
export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Get post count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const postCount = await Post.countDocuments({ category: category._id });
        return {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          postCount,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/categories - Create category
export const createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const categorySlug = slug || slugify(name, { lower: true, strict: true });

    const exists = await Category.findOne({ slug: categorySlug });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name, slug: categorySlug });

    res.status(201).json({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      postCount: 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/categories/:id - Update category
export const updateCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) {
      category.name = name;
      category.slug = slug || slugify(name, { lower: true, strict: true });
    } else if (slug) {
      category.slug = slug;
    }

    await category.save();

    const postCount = await Post.countDocuments({ category: category._id });

    res.json({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      postCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    // Check if category has posts
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
    res.status(500).json({ message: error.message });
  }
};

// ========== TAGS CRUD ==========

// GET /api/admin/tags - Get all tags with postCount
export const getAdminTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });

    // Get post count for each tag
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
    res.status(500).json({ message: error.message });
  }
};

// ========== POSTS ADMIN ==========

// Validate tags exist in DB
const validateTags = async (tags = []) => {
  if (!Array.isArray(tags) || tags.length === 0) return;

  const invalidIds = tags.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id)
  );
  if (invalidIds.length > 0) {
    throw new Error("One or more tag IDs are invalid");
  }

  const existingTagsCount = await Tag.countDocuments({ _id: { $in: tags } });

  if (existingTagsCount !== tags.length) {
    throw new Error("One or more tags do not exist");
  }
};

// GET /api/admin/posts - Get all posts for admin (including drafts)
export const getAdminPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("author", "name email")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    res.json({
      page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts,
    });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/posts - Create post
export const createPost = async (req, res) => {
  try {
    const {
      title,
      content,
      slug,
      category,
      tags,
      status,
    } = req.body;

    // Handle file upload
    let featuredImageUrl = req.body.featuredImage;
    if (req.file) {
      featuredImageUrl = `/uploads/${req.file.filename}`;
    }

    if (!title || !content || !category) {
      return res.status(400).json({
        message: "Title, content, and category are required",
      });
    }

    // Validate category
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" });
    }

    // Validate tags
    if (tags && tags.length > 0) {
      await validateTags(tags);
    }

    const postSlug = slug || slugify(title, { lower: true, strict: true });

    const existingPost = await Post.findOne({ slug: postSlug });
    if (existingPost) {
      return res.status(409).json({ message: "A post with this slug already exists" });
    }

    const post = await Post.create({
      title,
      content,
      slug: postSlug,
      category,
      tags: tags || [],
      status: status || "draft",
      featuredImage: featuredImageUrl,
      author: req.user._id,
    });

    await post.populate("author", "name email");
    await post.populate("category", "name slug");
    await post.populate("tags", "name slug");

    res.status(201).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    res.status(500).json({ message: error.message || "Failed to create post" });
  }
};


// PUT /api/admin/posts/:id - Update post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      slug,
      category,
      tags,
      status,
    } = req.body;

    // Handle file upload
    let featuredImageUrl = req.body.featuredImage;
    if (req.file) {
      featuredImageUrl = `/uploads/${req.file.filename}`;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findById(id);
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

    // Validate category if provided
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category not found" });
      }
    }

    // Validate tags if provided
    if (tags && tags.length > 0) {
      await validateTags(tags);
    }

    // Check slug uniqueness if changing
    if (slug && slug !== post.slug) {
      const existingPost = await Post.findOne({ slug });
      if (existingPost) {
        return res.status(409).json({
          message: "A post with this slug already exists",
        });
      }
    }

    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (slug) post.slug = slug;
    if (category) post.category = category;
    if (tags) post.tags = tags;
    if (status) post.status = status;
    if (featuredImageUrl !== undefined) post.featuredImage = featuredImageUrl;

    await post.save();

    await post.populate("author", "name email");
    await post.populate("category", "name slug");
    await post.populate("tags", "name slug");

    res.json({
      success: true,
      post,
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

    // Ownership check
    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
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

    res.json({
      totalPosts,
      publishedPosts,
      draftPosts,
      categoriesCount,
      tagsCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
