import mongoose from "mongoose";
import slugify from "slugify";

const requiredIfPublished = function () {
  return this.status === "published";
};

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: requiredIfPublished,
      trim: true
    },
    content: {
      type: String,
      required: requiredIfPublished
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    revisionOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft"
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
      }
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: requiredIfPublished,
    },
    metaDescription: {
      type: String,
      default: "",
      trim: true
    },
    focusKeyword: {
      type: String,
      default: "",
      trim: true
    },
    featuredImage: {
      type: String,
      default: null
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true }
);

// Fix: Use async without next parameter
PostSchema.pre("save", async function () {
  if (this.revisionOf) return;
  if (this.isModified("title") && !this.slug && typeof this.title === "string") {
    const trimmedTitle = this.title.trim();
    if (trimmedTitle) {
      this.slug = slugify(trimmedTitle, { lower: true, strict: true });
    }
  }
});

/* ✅ INDEXES */
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ category: 1, status: 1, createdAt: -1 });
PostSchema.index({ tags: 1, status: 1, createdAt: -1 });
PostSchema.index({ revisionOf: 1, status: 1, updatedAt: -1 });

export default mongoose.model("Post", PostSchema);
