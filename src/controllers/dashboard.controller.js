import mongoose from "mongoose"
 import {Video} from "../models/video.model.js"
 import {Subscription} from "../models/subscription.model.js"
 import {Like} from "../models/like.model.js"
 import {ApiError} from "../utils/ApiError.js"
 import {ApiResponse} from "../utils/ApiResponse.js"
 import {asyncHandler} from "../utils/asyncHandler.js"
 
 const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user;
    const videos = await Video.find({owner: userId});
    const totalVideos = videos.length;
    const totalViews = totalVideos.reduce((acc, video) => acc + video.views, 0);
    const totalLikes = await Like.countDocuments({video: {$in : videos}});
    const totalSubscribers = await Subscription.countDocuments({channel: userId});
    const stats = {
        totalVideos,
        totalViews,
        totalLikes,
        totalSubscribers
    }
    return res
    .status(200)
    .json(ApiResponse(200, stats, "Channel stats fetched successfully"));
    
 })
 
 const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user;
    const videos = await Video.find({owner: userId}).sort({createdAt: -1});
    if(videos.length === 0){
        return res
        .status(200)
        .json(ApiResponse(200, [], "No videos found"))
    }
    return res
    .status(200)
    .json(ApiResponse(200, videos, "Videos fetched successfully"));
 })
 
 export {
    getChannelStats, 
    getChannelVideos
}