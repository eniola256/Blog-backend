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
      user: req.user._id,
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
      .populate("user", "name");

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

    const isOwner = comment.user.toString() === req.user._id.toString();
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

/**
 * Update/Edit a comment
 */
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Content is required" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only the comment owner can edit
    const isOwner = comment.user.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: "Not authorized to edit this comment" });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();

    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle like on a comment
 * If user has already liked, it unlikes (removes the like)
 * If user hasn't liked, it adds a like
 */
export const toggleLikeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user already liked the comment
    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // Unlike: remove user from likes array
      comment.likes = comment.likes.filter(
        (like) => like.toString() !== userId.toString()
      );
    } else {
      // Like: add user to likes array
      comment.likes.push(userId);
    }

    await comment.save();

    res.json({
      message: hasLiked ? "Comment unliked" : "Comment liked",
      likesCount: comment.likes.length,
      hasLiked: !hasLiked,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
