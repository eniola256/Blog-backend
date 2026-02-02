import Category from "../models/category.js";
import Post from "../models/Post.js";

export const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .select("name slug")
      .sort({ name: 1 });

    res.json({categories});
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};


export const getCategoryWithPosts = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug }).select("name slug");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const posts = await Post.find({
      category: category._id,
      status: "published"
    })
      .populate("author", "name")
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    res.json({
      category,
      posts
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch category" });
  }
};
