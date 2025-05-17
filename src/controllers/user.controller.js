import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import cloudinary from "cloudinary";
import mongoose from "mongoose";

// To do later: apply validation on email too

const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dwpegmm0x/image/upload/v1735559628/tdu9fhmslrlknpm4eq5g.webp";

const isProduction = process.env.NODE_ENV === "production";

const options = {
    httpOnly: true,
    secure: isProduction, // true only in production
    sameSite: isProduction ? "None" : "Lax", // 'None' for cross-site, 'Lax' for local dev
}

const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };


    } catch (error) {
        throw new ApiError(500, "Failed to generate access and refresh tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // user details from frontend -> validation(not empty) -> check if user exists -> check for images, coverImage -> upload to cloudinary -> create object user & save to db -> remove pswd & refresh token -> check for user creation -> send response

    // user details from frontend
    const { username, email, fullName, password } = req.body;

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "Please fill in all fields");
    }

    const existedUser = await User.findOne({
        $or:[{ username }, { email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with username or email already exists");
    }

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    let avatarLocalPath = "";
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath = "";
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // not needed now since we have a default avatar image
    // if(!avatarLocalPath){
    //     throw new ApiError(400, "Please upload an avatar image");
    // }

    const avatar = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : { url: DEFAULT_AVATAR_URL };
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : { url: "" };

    if(!avatar){
        throw new ApiError(500, "Failed to upload avatar image");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.secure_url,
        coverImage: coverImage?.secure_url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
});

const loginUser = asyncHandler(async (req, res) => {
    // user details -> req.body->data -> atleast username/email -> find user -> pswd check -> access and refresh token -> send cookie -> send response(successful login)

    const { username, email, password } = req.body;
    if(!username && !email){
        throw new ApiError(400, "Please provide username or email to login");
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(!user){
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }
    
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    // console.log("accessToken", accessToken);
    // console.log("refreshToken", refreshToken);
    // console.log("loggedInUser", loggedInUser);
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )

}) 

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,{
            $unset: { refreshToken: "" } // Use $unset to remove the field
        },{
            new: true
        }
    )

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const { incomingRefreshToken } = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET, 
        )
    
        const user = User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if( incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "IRefresh token is expried or invalid");
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, { accessToken, newRefreshToken }, "Access token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh token");
    }
    
});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const { oldPassword, newPassword } = req.body;

    if(!oldPassword || !newPassword){
        throw new ApiError(400, "Please provide old and new password");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));   

})

const getCurrentUser = asyncHandler(async(req, res) => {
    // const user = req.user;
    // if(!user){
    //     throw new ApiError(401, "Unauthorized request");
    // }

    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const { fullName, username } = req.body;

    if(!fullName || !username){
        throw new ApiError(400, "Please provide full name and username");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully"));
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path; 
    const prevAvatar = req.user?.avatar;

    if(!avatarLocalPath){
        throw new ApiError(400, "Please upload an avatar image");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.secure_url){
        throw new ApiError(500, "Failed to upload avatar image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.secure_url
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    // delete prev avatar image from cloudinary
    if(prevAvatar && prevAvatar !== DEFAULT_AVATAR_URL){
        const publicId = prevAvatar.split("/").slice(-1)[0].split(".")[0];
        await cloudinary.uploader.destroy(publicId);
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));

});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path; 
    const prevCoverImage = req.user?.coverImage;
    if(!coverImageLocalPath){
        throw new ApiError(400, "Please upload an cover image");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.secure_url){
        throw new ApiError(500, "Failed to upload Cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.secure_url
            }
        },
        { new: true }
    ).select("-password -refreshToken");

    // delete prev cover image from cloudinary
    if(prevCoverImage){
        const publicId = prevCoverImage.split("/").slice(-1)[0].split(".")[0];
        await cloudinary.uploader.destroy(publicId);
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));

});

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel fetched successfully")
    )

});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            },
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            },

        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully")
    )
});

const updateWatchHistory = asyncHandler(async(req, res) => {
    const { videoId } = req.body;

    if(!videoId){
        throw new ApiError(400, "Please provide video id");
    }

    const user = await User.findById(req.user._id);
    if(!user){
        throw new ApiError(404, "User not found");
    }
    const videoObjectId = new mongoose.Types.ObjectId(videoId);
    user.watchHistory = user.watchHistory.filter(
        (id) => id.toString() !== videoObjectId.toString()
    );
    user.watchHistory.push(videoObjectId); 
    
    await user.save({ validateBeforeSave: false });
    return res
    .status(200)
    .json(
        new ApiResponse(200, user.watchHistory, "Watch History updated successfully")
    )
});

export { registerUser, loginUser, logoutUser, refreshAccessToken , changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory, updateWatchHistory };