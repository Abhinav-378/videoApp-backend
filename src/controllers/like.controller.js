import mongoose, {isValidObjectId} from "mongoose"
 import {Like} from "../models/like.model.js"
 import { Video } from "../models/video.model.js"
 import {ApiError} from "../utils/ApiError.js"
 import {ApiResponse} from "../utils/ApiResponse.js"
 import {asyncHandler} from "../utils/asyncHandler.js"
 
 const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    const user = req.user;
    const like = await Like.findOne({video: videoId, likedBy: user._id})
    if(like){
        await like.remove()
        await Video.findByIdAndUpdate(videoId, { $inc: { likes: -1 } });
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully"))
    }
    const newLike = await Like.create({
        video: videoId,
        likedBy: user._id
    })
    if(!newLike){
        throw new ApiError(500, "Failed to like video")
    }
    await Video.findByIdAndUpdate(videoId, { $inc: { likes: 1 } });
    return res
    .status(201)
    .json(new ApiResponse(201, newLike, "Video liked successfully"))

 })
 
 const toggleCommentLike = asyncHandler(async (req, res) => {
     const {commentId} = req.params
     //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }
    const user = req.user;
    const like = await Like.findOne({comment: commentId, likedBy: user._id})
    if(like){
        await like.remove()
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully"))
    }
    const newLike = await Like.create({ comment: commentId, likedBy: user._id })
    return res
    .status(201)
    .json(new ApiResponse(201, newLike, "Comment liked successfully"))
 
 })
 
 const toggleTweetLike = asyncHandler(async (req, res) => {
     const {tweetId} = req.params
     //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }
    const user = req.user;
    const like = await Like.findOne({tweet: tweetId, likedBy: user._id})
    if(like){
        await like.remove()
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully"))
    }
    const newLike = await Like.create({ tweet: tweetId, likedBy: user._id })
    return res
    .status(201)
    .json(new ApiResponse(201, newLike, "Tweet liked successfully"))
 }
 )
 
 const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const user = req.user;
    const likes = await Like.aggregate([
        {
            $match:{
                likedBy: new mongoose.Types.ObjectId(user._id),
                video: {$exists: true}
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $project:{
                _id: "$videoDetails._id",
                video: {
                    title: "$videoDetails.title",
                    thumbnail: "$videoDetails.thumbnail",
                    views: "$videoDetails.views",
                    duration: "$videoDetails.duration",
                    description: "$videoDetails.description", 
                    owner: "$videoDetails.owner"
                },
            }
        }

    ])
    return res
    .status(200)
    .json(new ApiResponse(200, likes, "Liked videos retrieved successfully"))
 })
 
 export {
     toggleCommentLike,
     toggleTweetLike,
     toggleVideoLike,
     getLikedVideos
 }