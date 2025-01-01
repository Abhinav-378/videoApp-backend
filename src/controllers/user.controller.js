import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// To do later: apply validation on email too

const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.genrateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };


    } catch (error) {
        throw new ApiError(500, "Failed to generate access and refresh tokens");
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // user details from frontend -> validation(not empty) -> check if user exists -> check for images, avatar -> upload to cloudinary -> create object user & save to db -> remove pswd & refresh token -> check for user creation -> send response

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

    const avatar = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : { url: "https://res.cloudinary.com/dwpegmm0x/image/upload/v1735559628/tdu9fhmslrlknpm4eq5g.webp" };
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : { url: "" };

    if(!avatar){
        throw new ApiError(500, "Failed to upload avatar image");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
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

    const options = {
        httpOnly: true,
        secure: true
    }

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
            $set:{
                refreshToken: undefined
            }
        },{
            new: true
        }
    )

    const options = {
    httpOnly: true,
    secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
});

export { registerUser, loginUser, logoutUser };