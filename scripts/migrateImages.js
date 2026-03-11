// scripts/migrateImages.js
import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Post from '../src/models/Post.js';
import { uploadImage } from '../src/utils/cloudinary.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to DB');

const posts = await Post.find({ featuredImage: /^data:image\// });
console.log(`Migrating ${posts.length} posts...`);

for (const post of posts) {
  try {
    const url = await uploadImage(post.featuredImage);
    await Post.updateOne({ _id: post._id }, { featuredImage: url });
    console.log(`✅ Migrated: ${post.slug}`);
  } catch (err) {
    console.error(`❌ Failed: ${post.slug}`, err.message);
  }
}

await mongoose.disconnect();
console.log('Done!');