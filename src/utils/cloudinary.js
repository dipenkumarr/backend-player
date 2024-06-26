import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { loadEnvFile } from "process";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to cloudinary from local storage
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("File uploaded to cloudinary! ", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // removes the file from local storage server, if the ops failed
        console.log("CLOUDINARY ERROR: ", error);
        return null;
    }
};

export { uploadOnCloudinary };
