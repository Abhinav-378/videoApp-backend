import mongoose, {isValidObjectId} from "mongoose"
 import {User} from "../models/user.model.js"
 import { Subscription } from "../models/subscription.model.js"
 import {ApiError} from "../utils/ApiError.js"
 import {ApiResponse} from "../utils/ApiResponse.js"
 import {asyncHandler} from "../utils/asyncHandler.js"
 
 
 const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const user = req.user;
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }
    const subscription = await Subscription.findOne({channel: channelId, subscriber: user._id});
    if(subscription){
        await subscription.deleteOne()
        return res.status(200).json(new ApiResponse(200, null, "Subscription removed successfully"))
    }
    const newSubscription = await Subscription.create({ channel: channelId, subscriber: user._id })
    return res
    .status(201)
    .json(new ApiResponse(201, newSubscription, "Subscription added successfully"))

 })
 
 // controller to return subscriber list of a channel
 const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id");
    }
    const subscribers = await Subscription.find({channel: channelId}).populate("subscriber", "name username avatar");
    const subscriberList = subscribers.map(subscription => subscription.subscriber)
    return res
    .status(200)
    .json(new ApiResponse(200, subscriberList, "Subscriber list fetched successfully"));

 })
 
 // controller to return channel list to which user has subscribed
 const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriber id");
    }
    const channels = await Subscription.find({subscriber: subscriberId}).populate("channel", "name username avatar");
    // const channels = await Subscription.aggregate([
    //     {
    //         $match:{
    //             subscriber: new mongoose.Types.ObjectId(subscriberId)
    //         }
    //     },
    //     {
    //         $lookup:{
    //             from : "users",
    //             localField: "channel",
    //             foreignField: "_id",
    //             as: "channelDetails"
    //         }
    //     },
    //     {
    //         $unwind: "$channelDetails"
    //     },
    //     {
    //         $project:{
    //             channel: {
    //                 _id: 1,
    //                 name: "$channelDetails.name",
    //                 username: "$channelDetails.username",
    //                 avatar: "$channelDetails.avatar"
    //             }
    //         }
    //     }
    // ])
    const channelList = channels.map(subscription => subscription.channel)
    return res
    .status(200)
    .json(new ApiResponse(200, channelList, "Subscribed channel list fetched successfully"));
 })
 
 export {
     toggleSubscription,
     getUserChannelSubscribers,
     getSubscribedChannels
 }