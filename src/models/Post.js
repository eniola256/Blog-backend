import mongoose from "mongoose";
import slugify from "slugify";

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    slug: {
      type: String,
      unique: true,
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
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Fix: Use async without next parameter
PostSchema.pre("save", async function () {
  if (this.isModified("title") && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
});

/* ✅ INDEXES */
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("Post", PostSchema);