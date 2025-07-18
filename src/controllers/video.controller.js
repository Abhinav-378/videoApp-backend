import mongoose, {isValidObjectId} from "mongoose"
 import {Video} from "../models/video.model.js"
 import {User} from "../models/user.model.js"
 import {ApiError} from "../utils/ApiError.js"
 import {ApiResponse} from "../utils/ApiResponse.js"
 import {asyncHandler} from "../utils/asyncHandler.js"
 import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
 
 const formatDuration = (durationInSeconds) => {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
 
 const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy="createdAt", sortType="desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const queryObj = {}
    if(userId && isValidObjectId(userId)){
        queryObj.owner = new mongoose.Types.ObjectId(userId)
    }
    const sortObj = {}
    sortObj[sortBy] = sortType === "desc" ? -1 : 1

    const videos = await Video.find(queryObj).sort(sortObj).limit(limit).skip((page - 1) * limit).populate("owner", "username avatar fullName")

    const totalVideos = await Video.countDocuments(queryObj)
    return res
    .status(200)
    .json(new ApiResponse(200, {
        videos,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalVideos,
            totalPages: Math.ceil(totalVideos / limit)
        }
    }, "Videos fetched successfully"))

 })
 
 const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if(!title || !description){
        throw new ApiError(400, "Title and description are required")
    }
    // TODO: get video, upload to cloudinary, create video
    const ownerId = req.user?._id
    if(!isValidObjectId(ownerId)){
        throw new ApiError(400, "Invalid user id")
    }
    const videoFilePath = req.files?.videoFile?.[0]?.path;
    const thumbnailPath = req.files?.thumbnail?.[0]?.path;

    if(!videoFilePath || !thumbnailPath){
        throw new ApiError(400, "Video file and thumbnail are required")
    }
    const videoUploadRes = await uploadOnCloudinary(videoFilePath)
    const thumbnailUploadRes = await uploadOnCloudinary(thumbnailPath)
    // console.log("video: ", videoUploadRes)
    if(!videoUploadRes || !thumbnailUploadRes){
        throw new ApiError(500, "Failed to upload video or thumbnail")
    }
    const video = await Video.create({
        title,
        description,
        videoFile: videoUploadRes.secure_url,
        videoFilePublicId: videoUploadRes.public_id,
        thumbnail: thumbnailUploadRes.secure_url,
        thumbnailPublicId: thumbnailUploadRes.public_id,
        owner: new mongoose.Types.ObjectId(ownerId),
        duration: formatDuration(videoUploadRes.duration),
    })
    if(!video){
        throw new ApiError(500, "Failed to publish video")
    }

    return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"))
 })
 
 const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    //TODO: get video by id
    const video = await Video.findById(videoId).populate("owner", "username avatar fullName")
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    video.views = video.views + 1
    await video.save()
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"))


 })
 
 const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    //TODO: update video details like title, description, thumbnail
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    const { title, description } = req.body
    if(title) video.title = title
    if(description) video.description = description
    if(req.file?.path){
        const thumbnailPath = req.file.path
        const thumbnailUploadRes = await uploadOnCloudinary(thumbnailPath)
        if(!thumbnailUploadRes){
            throw new ApiError(500, "Failed to upload thumbnail")
        }
        // delete old thumbnail from cloudinary
        if(video.thumbnailPublicId){
            await deleteFromCloudinary(video.thumbnailPublicId)
        }
        video.thumbnail = thumbnailUploadRes.secure_url
    }
    await video.save()
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"))
 })
 
 const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    try {
        if (video.videoFilePublicId) {
            await deleteFromCloudinary(video.videoFilePublicId, "video");
        }

        if (video.thumbnailPublicId) {
            await deleteFromCloudinary(video.thumbnailPublicId);
        }
    } catch (err) {
        // console.error("Error deleting from Cloudinary", err);
    }
    // remove the video
    await Video.findByIdAndDelete(videoId);
    return res
    .status(200)
    .json(new ApiResponse(200,null,"Video Removed Successfully"))
 })
 
 const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    video.isPublished = !video.isPublished
    await video.save()
    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video publish status updated successfully"))
 })
 
 const getAllVideosByChannelId = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id");
    }
    const videos = await Video.find({ owner: channelId, isPublished: true })
        .sort({ createdAt: -1 }); // Sort by creation date, most recent first
    if (!videos || videos.length === 0) {
        return res.status(404).json(new ApiResponse(404, null, "No videos found for this channel"));
    }
    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
 })
 const getRandomVideos = asyncHandler(async (req, res) => {
    const { limit = 24 } = req.query;
    // console.log("random videos func called")
    // Get all published videos
    const videos = await Video.find({ isPublished: true })
        .populate("owner", "_id username avatar fullName")
        .select("_id title thumbnail views duration createdAt owner ")
        .lean(); // Convert to plain JS object for better performance
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const randomVideos = shuffleArray(videos).slice(0, parseInt(limit));

    if (!randomVideos?.length) {
        throw new ApiError(404, "No videos found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                randomVideos,
                "Random videos fetched successfully"
            )
        );
});

 const searchVideos = asyncHandler(async (req, res) => {
    const { q: searchQuery } = req.query;

    if (!searchQuery) {
        throw new ApiError(400, "Search query is required");
    }

    const searchRegex = new RegExp(searchQuery, 'i');

    const videos = await Video.find({ isPublished: true })
        .populate('owner', 'username fullName avatar')
        .lean();

    const filteredVideos = videos.filter(video => 
        searchRegex.test(video.title) || 
        searchRegex.test(video.description) || 
        searchRegex.test(video.owner?.username) || 
        searchRegex.test(video.owner?.fullName)
    );
    
    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                filteredVideos,
                "Videos fetched successfully"
            )
        );
});

 export {
     getAllVideos,
     publishAVideo,
     getVideoById,
     updateVideo,
     deleteVideo,
     togglePublishStatus,
     getAllVideosByChannelId,
     getRandomVideos,
     searchVideos
 }