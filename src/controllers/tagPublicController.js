import Tag from "../models/tag.model.js";
import Post from "../models/Post.js";

export const getPublicTags = async (req, res) => {
  try {
    const tags = await Tag.find()
      .select("name slug")
      .sort({ name: 1 });

    res.json({ tags });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tags" });
  }
};

export const getTagWithPosts = async (req, res) => {
  try {
    const { slug } = req.params;

    const tag = await Tag.findOne({ slug }).select("name slug");
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    const posts = await Post.find({
      tags: tag._id,
      status: "published",
    })
      .populate("author", "name")
      .populate("tags", "name slug")
      .sort({ createdAt: -1 });

    res.json({ tag, posts });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tag" });
  }
};
