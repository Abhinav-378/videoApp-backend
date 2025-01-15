import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;




  
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
    })
    await comment.save();
    return res
    .status(201)
    .json(new ApiResponse(201, "Comment added successfully", comment));
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
    if(comment.owner.toString() !== user._id.toString()){
        throw new ApiError(403, "You are not authorized to update this comment");
    }
    comment.content = content;
    await comment.save();
    return res
    .status(200)
    .json(new ApiResponse(200, "Comment updated successfully", comment));

});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
    const { commentId } = req.params;
    const { user } = req;
    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(404, "Comment not found");
    }
    if(comment.owner.toString() !== user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this comment");
    }
    await comment.deleteOne(); // comment.remove() -> deprecated
    return res
    .status(200)
    .json(new ApiResponse(200, "Comment deleted successfully", comment));
});

export { getVideoComments,
    addComment,
    updateComment,
    deleteComment 
};
