import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken; // add refresh token to the db
        await user.save({ validateBeforeSave: false }); // save the user

        return { accessToken, refreshToken };
    } catch (error) {
        throw new apiError(
            500,
            "Error while generating acces and refresh token"
        );
    }
};

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

const loginUser = asyncHandler(async (req, res) => {
    // get data from req body
    // check is username or email exists
    //  find the user
    // if user is there - check password
    // if password is correct - create access and refresh token
    // save refresh token in database
    // send cookies
    // return response

    const { email, username, password } = req.body;

    if (!(username || email)) {
        throw new apiError(400, "Username or email is required");
    }

    // either username or email in db - always await with db
    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new apiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid password");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // cookies send
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // Remove access & refresh tokens
    // Remove cookies

    // got access to req.user due to middleware verifyJWT
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
