import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto",
        });

        //file has bee uploaded successfully
        console.log("File uploaded successfully on cloudinary", response.url);
        return response;
        
    } catch (error) {
         fs.unlinkSync(localFilePath); //remove file from locally saved temp file as the upload failed
         return null;
    }
}

export { uploadOnCloudinary };