import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getAllVideosByChannelId,
    getRandomVideos,
    getVideoById,
    publishAVideo,
    searchVideos,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();

// don't require verifyJWT(public routes)
router.route("/random").get(getRandomVideos);
router.route("/search").get(searchVideos);
router.route("/c/:channelId").get(getAllVideosByChannelId);
router.route("/:videoId").get(getVideoById);
// protected routes
router
    .route("/")
    .get(verifyJWT, getAllVideos)
    .post(
        verifyJWT,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },

        ]),
        publishAVideo
    );

router
    .route("/:videoId")
    .delete(verifyJWT, deleteVideo)
    .patch(verifyJWT, upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);

export default router