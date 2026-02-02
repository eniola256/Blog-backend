import express from 'express';
import {
  getPublishedPosts,
  getPublishedPostBySlug
} from '../controllers/postPublicController.js';

const router = express.Router();


router.get('/', getPublishedPosts);
router.get('/:slug', getPublishedPostBySlug);

export default router;