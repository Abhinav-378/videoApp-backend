import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    // can use *mongooseAggregatePaginate* later to implement pagination for more cleaner and efficient code (in case of large number of comments)
    
    // get all comments for a video
    const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const comments = await Comment.aggregate([
    {
        $match:{
            video: new mongoose.Types.ObjectId(videoId)
        }, 
    },
    {
        $sort: {createdAt: -1}
    },
    {
        $skip: skip,
    },
    {
        $limit: limitNum,
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
      $lookup:{
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likesDetails"
      }
    },
    {
      $addFields:{
        likesCount: { $size: "$likesDetails" },
      }
    },
    {
        $project:{
            content: 1,
            createdAt: 1,
            updatedAt: 1,
            likesCount: 1,
            likesDetails: 1,
            ownerName: "$ownerDetails.username",
            ownerAvatar: "$ownerDetails.avatar",
            _id: 1
        }
    }
  ])

  const totalComments = await Comment.countDocuments({ video: videoId });
  // counting likes in each comment and adding to each comment ele inarray itself
  return res
    .status(200)
    .json(
        new ApiResponse(200, {
            totalComments,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalComments / limitNum),
            comments
        }, "Comments retrieved successfully")
    )
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
  const { user } = req;
  const comment = new Comment({
    content,
    video: videoId,
    owner: user._id,
  });
  await comment.save();
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  const { user } = req;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }
  comment.content = content;
  await comment.save();
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const { user } = req;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }
  await comment.deleteOne(); // comment.remove() -> deprecated
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
