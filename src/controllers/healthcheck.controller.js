import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose from "mongoose";

const healthcheck = asyncHandler(async (req, res) => {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1;

    // checks
    const checks = {
        server: "healthy",
        database: dbStatus ? "connected" : "disconnected",
        timestamp: new Date(),
        uptime: process.uptime()
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            checks, 
            "Health check successful"
        )
    );
})
 
export {
    healthcheck
}