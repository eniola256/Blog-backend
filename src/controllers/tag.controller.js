import Tag from "../models/tag.model.js";

export const createTag = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await Tag.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "Tag already exists" });
    }

    const tag = await Tag.create({ name });
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }

    await tag.deleteOne();

    res.json({ message: "Tag deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// controllers/tag.controller.js - ADD THIS NEW FUNCTION
export const getTagBySlug = async (req, res) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });
    
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }
    
    res.json({ tag });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};