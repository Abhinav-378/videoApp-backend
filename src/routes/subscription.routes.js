import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// don't require verifyJWT(public routes)
router.route("/c/:channelId").get(getSubscribedChannels);

// protected routes
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file
router.route("/c/:channelId").post(toggleSubscription);
router.route("/u/:channelId").get(getUserChannelSubscribers);

export default router;
