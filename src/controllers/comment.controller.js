import Comment from "../models/comment.model.js";
import Post from "../models/Post.js";

/**
 * Create a comment on a post
 */
export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: "Post ID and content are required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await Comment.create({
      content,
      post: postId,
      author: req.user._id,
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all comments for a post
 */
export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("author", "name");

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isOwner = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    await comment.deleteOne();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
