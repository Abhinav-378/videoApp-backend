import { Router } from 'express';
 import {
     addVideoToPlaylist,
     createPlaylist,
     deletePlaylist,
     getPlaylistById,
     getUserPlaylists,
     removeVideoFromPlaylist,
     updatePlaylist,
 } from "../controllers/playlist.controller.js"
 import {verifyJWT} from "../middlewares/auth.middleware.js"
 
 const router = Router();

    // Public routes
 router.route("/user/:userId").get(getUserPlaylists);
 router.route("/:playlistId").get(getPlaylistById);
 
    // Protected routes
 
 router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file
 
 router.route("/").post(createPlaylist)
 
 router
     .route("/:playlistId")
     .patch(updatePlaylist)
     .delete(deletePlaylist);
 
 router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
 router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);
 
 
 export default router