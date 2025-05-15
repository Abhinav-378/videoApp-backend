import mongoose, { isValidObjectId } from "mongoose"
 import {Tweet} from "../models/tweet.model.js"
 import {User} from "../models/user.model.js"
 import {ApiError} from "../utils/ApiError.js"
 import {ApiResponse} from "../utils/ApiResponse.js"
 import {asyncHandler} from "../utils/asyncHandler.js"
 
 const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    const user = req.user;
    if(!content?.trim()){
        throw new ApiError(400, "Content is required")
    }
    const tweet = await Tweet.create({
        content,
        owner: user._id
    })
    if(!tweet){
        throw new ApiError(500, "Failed to create tweet")
    }
    return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"))
        
 })
 
 const getUserTweets = asyncHandler(async (req, res) => { // can add pagination later...
    // TODO: get user tweets
    const {userId} = req.params;
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }
    // const tweets = await Tweet.find({owner: userId})
    // .populate("owner", "name username avatar") //replaces the owner field (just an ObjectId) with actual user data
    // .sort({createdAt: -1})
    const tweets = await Tweet.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            },
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner:{
                    name: "$ownerDetails.name",
                    username: "$ownerDetails.username",
                    avatar: "$ownerDetails.avatar"
                }
            }
        },
        {
            $sort: {updatedAt: -1}
        }
    ]);
    if(tweets.length === 0){
        return res
        .status(200)
        .json(new ApiResponse(200, [], "No tweets found"))
    }
    return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"))

 })
 
 const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;
    const user = req.user;
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }
    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }
    tweet.content = content;
    await tweet.save();
    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"))
 })
 
 const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    const user = req.user;
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }
    const tweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: user._id
    });

    if(!tweet){
        throw new ApiError(404, "Tweet not found or unauthorized")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"))

 })
 
 export {
     createTweet,
     getUserTweets,
     updateTweet,
     deleteTweet
 }