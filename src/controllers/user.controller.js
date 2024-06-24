import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend according to user model
    // validation of user details - not empty
    // check if user already exists - using username and email
    //  check for images - check for avatar
    // If image there -> upload them to cloudinary -> check for avatar
    // create user object - create entry in database
    // Remove password and refresh token field from response
    // Check for user creation
    // return response

    const { username, email, fullname, password } = req.body;
    console.log("email: ", email);

    if (
        [username, email, fullname, password].some((field) => {
            field?.trim() === "";
        })
    ) {
        throw new apiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        throw new apiError(409, "User already exists");
    }

    // gives path of avatar - from multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is required");
    }

    // upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apiError(400, "Avatar is required");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // - for fields that we dont want
    );

    if (!createdUser) {
        throw new apiError(500, "Failed to create a user");
    }

    return res
        .status(201)
        .json(new apiResponse(200, createdUser, "User created successfully"));
});

export { registerUser };
