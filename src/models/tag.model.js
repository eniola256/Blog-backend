import mongoose from "mongoose";
import slugify from "slugify";

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      index: true
    }
  },
  { timestamps: true }
);

// Fix: Remove 'next' parameter for async functions
tagSchema.pre("save", async function () {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
    console.log("SLUG GENERATED:", this.slug);
  }
});

export default mongoose.model("Tag", tagSchema);