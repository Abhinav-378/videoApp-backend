import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { addComment, deleteComment, getVideoComments, updateComment } from '../controllers/comment.controller.js';
const router = Router();

// public routes
router.route("/:videoId").get(getVideoComments);

// protected routes
router.use(verifyJWT); 
router.route("/:videoId").post(addComment); 
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;