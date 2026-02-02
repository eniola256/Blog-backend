import Post from '../models/Post.js';
import User from '../models/User.js';   
import Tag from '../models/tag.model.js';
import Category from '../models/category.js';

export const getPublishedPosts = async (req, res) => {
  console.log("➡️  getPublishedPosts called");
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters from query
    const search = req.query.search || "";
    const authorName = req.query.author || "";
    const tagSlug = req.query.tag || "";
    const categorySlug = req.query.category || "";

    // Base query
    const query = { status: "published" };

    // Filter by category slug
    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug });

      if (!category) {
        return res.status(404).json({
          message: "Category not found"
        });
      }

      query.category = category._id;
    }

    // Search by title
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // Filter by author
    if (authorName) {
      const authors = await User.find({
        name: { $regex: authorName, $options: "i" }
      }).select("_id");

      if (authors.length === 0) {
        return res.json({
          page,
          totalPages: 0,
          totalPosts: 0,
          posts: []
        });
      }

      query.author = { $in: authors.map(a => a._id) };
    }

    // Filter by tag
    if (tagSlug) {
      const tag = await Tag.findOne({ slug: tagSlug });
      if (!tag) {
        return res.json({
          page,
          totalPages: 0,
          totalPosts: 0,
          posts: []
        });
      }
      query.tags = tag._id;
    }

    // Fetch posts with pagination
    const posts = await Post.find(query)
      .populate("author", "name role")
      .populate("category", "name slug")
      .populate("tags", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Total count for pagination
    const totalPosts = await Post.countDocuments(query);

    // Return response
    res.json({
      page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
      posts
    });

  } catch (error) {
    console.error("GET PUBLISHED POSTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const getPublishedPostBySlug = async (req, res) => {
  console.log("➡️  getPublishedPosts by slug");
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      status: 'published'
    })
    .populate('author', 'name')
    .populate('category', 'name slug')
    .populate("tags", "name slug");

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};