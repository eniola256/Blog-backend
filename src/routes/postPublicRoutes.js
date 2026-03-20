import express from 'express';
import {
  getPublishedPosts,
  getPublishedPostBySlug
} from '../controllers/postPublicController.js';

const router = express.Router();

const cacheControl = (seconds) => (req, res, next) => {
  res.set(
    "Cache-Control",
    `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`
  );
  next();
};

router.get('/', cacheControl(60), getPublishedPosts);
router.get('/:slug', cacheControl(300), getPublishedPostBySlug);

export default router;
