

import {
    validateUserInput,
    verifyPassword,
    generate4DigitCode,
    sendEmailVerificationCode,
    generateJwtToken,
    generateRefreshToken,
    validateEmailVerificationInput,
    authenticateToken,
    getCoordinates,
    hashPassword
} from '../../resources/functions.js';
import jwt  from "jsonwebtoken"
import User from '../../models/user/userSchema.js';

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;


// export const signup = async (req, res) => {
//     try {
//         const {
//             first_name,
//             last_name,
//             email,
//             phone,
//             password,
//             user_type,
//             address,
//             postCodes = []
//         } = req.body;

//         // Validate required fields
//         if (!first_name || !last_name || !email || !password || !user_type || !address) {
//             return res.status(400).json({ error: "All required fields must be provided" });
//         }

//         // Validate email and password using existing functions
//         const { email: emailResult, password: passwordResult } = validateUserInput(email, password);
//         if (!emailResult.isValid) {
//             return res.status(400).json({ error: emailResult.message });
//         }
//         if (!passwordResult.isValid) {
//             return res.status(400).json({ error: passwordResult.message });
//         }

//         // Validate user_type
//         if (!["user", "specialist"].includes(user_type)) {
//             return res.status(400).json({ error: "user_type must be 'user' or 'specialist'" });
//         }

//         // Validate phone (if provided)
//         if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
//             return res.status(400).json({ error: "Invalid phone number format" });
//         }

//         // Validate address by attempting to geocode
//         try {
//             await getCoordinates(address, user_type === 'user' ? 'UK' : 'US');
//         } catch (error) {
//             return res.status(400).json({ error: `Invalid address: ${error.message}` });
//         }

//         // Check if email or phone already exists
//         const existingUser = await User.findOne({ $or: [{ email }, phone ? { phone } : {}] });
//         if (existingUser) {
//             return res.status(400).json({ error: "Email or phone already in use" });
//         }

//         // Hash password
//         const hashedPassword = await hashPassword(password);

//         // Generate verification code
//         const verificationCode = generate4DigitCode();

//         // Extract postcode from address (if applicable)
//         const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
//         const usZipRegex = /^\d{5}(-\d{4})?$/;
//         let extractedPostcodes = [...postCodes];
//         if (ukPostcodeRegex.test(address) || usZipRegex.test(address)) {
//             extractedPostcodes.push(address);
//         }


//         const refreshToken = generateRefreshToken(user._id.toString(), email)

//         // Create user
//         const user = new User({
//             first_name,
//             last_name,
//             email,
//             phone,
//             password: hashedPassword,
//             user_type,
//             address,
//             postCodes: extractedPostcodes,
//             verificationCode,
//             isVerified: false,
//                refreshToken
//         });

//         await user.save();

//         // Send verification email (non-blocking)
//         const emailResults = await sendEmailVerificationCode(email, verificationCode);
//         const response = {
//             message: "User registered successfully.",
//             user: {
//                 id: user._id,
//                 first_name,
//                 last_name,
//                 email,
//                 user_type,
//                 address
//             },
//             access_token: generateJwtToken(user._id.toString(), email),
//              refresh_token: refreshToken
//         };

//         // Handle email sending result
//         if (emailResults.success) {
//             response.message += " Please verify your email.";
//             response.verificationCode = verificationCode; 
//         } else {
//             response.message += " Warning: Failed to send verification email. Please try verifying later.";
//             response.emailWarning = emailResults.message;
//         }

//         // Return success response
//         res.status(201).json(response);
//     } catch (error) {
//         console.error("Signup error:", error);
//         res.status(500).json({ error: "Server error: " + error.message });
//     }
// };s



// export const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // Validate required fields
//         if (!email || !password) {
//             return res.status(400).json({ error: "Email and password are required" });
//         }

//         const { email: emailResult } = validateUserInput(email, password);
//         if (!emailResult.isValid) {
//             return res.status(400).json({ error: emailResult.message });
//         }

  
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(401).json({ error: "Invalid email or password" });
//         }

     
//         if (!user.isVerified) {
//             return res.status(403).json({ error: "Email not verified. Please verify your email to log in." });
//         }

//         // Verify password
//         const isPasswordValid = await verifyPassword(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({ error: "Invalid email or password" });
//         }

//         // Generate JWT token
//      const accessToken = generateJwtToken(user._id.toString(), email);
//            const refreshToken = generateRefreshToken(user._id.toString(), email);
   
//            // Save refresh token to user
//            user.refreshToken = refreshToken;
//            await user.save();
//         // Return success response
//         res.status(200).json({
//             message: "Login successful",
//             user: {
//                 id: user._id,
//                 first_name: user.first_name,
//                 last_name: user.last_name,
//                 email: user.email,
//                 user_type: user.user_type,
//                 address: user.address
//             },
//            access_token: accessToken,
//             refresh_token: refreshToken
//         });
//     } catch (error) {
//         console.error("Login error:", error);
//         res.status(500).json({ error: "Server error: " + error.message });
//     }
// };





// export const verifyEmail = [
//     // Apply validation middleware
//     validateEmailVerificationInput,
//     async (req, res) => {
//         try {
//             const { email, code } = req.body;

//             // Find user by email
//             const user = await User.findOne({ email });
//             if (!user) {
//                 return res.status(404).json({ error: "User not found" });
//             }

//             // Check if already verified
//             if (user.isVerified) {
//                 return res.status(400).json({ error: "Email already verified" });
//             }

//             // Verify code
//             if (user.verificationCode !== code) {
//                 return res.status(400).json({ error: "Invalid verification code" });
//             }

//             // Update user: mark as verified and clear verification code
//             user.isVerified = true;
//             user.verificationCode = undefined;
//             await user.save();

//             // Return success response
//             res.status(200).json({ message: "Email verified successfully" });
//         } catch (error) {
//             console.error("Email verification error:", error);
//             res.status(500).json({ error: "Server error: " + error.message });
//         }
//     }
// ];












// export const resendVerificationCode = async (req, res) => {
//     try {
//         const { email } = req.body;

//         // Validate email
//         if (!email) {
//             return res.status(400).json({ error: "Email is required" });
//         }
//         const { email: emailResult } = validateUserInput(email, "DummyPassword123");
//         if (!emailResult.isValid) {
//             return res.status(400).json({ error: emailResult.message });
//         }

//         // Find user by email
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         // Check if already verified
//         if (user.isVerified) {
//             return res.status(400).json({ error: "Email already verified" });
//         }

//         // Generate new verification code
//         const newCode = generate4DigitCode();
//         user.verificationCode = newCode;
//         await user.save();

//         // Send verification email (non-blocking)
//         const sendEmailResult = await sendEmailVerificationCode(email, newCode);
//         const response = {
//             message: "Verification code resent successfully."
//         };

//         // Handle email sending result
//         if (sendEmailResult.success) {
//             response.verificationCode = newCode; // Include code in success response
//         } else {
//             response.message = "Verification code generated, but failed to send email. Please try again later.";
//             response.emailWarning = sendEmailResult.message;
//         }

//         // Return response
//         res.status(200).json(response);
//     } catch (error) {
//         console.error("Resend verification code error:", error);
//         res.status(500).json({ error: "Server error: " + error.message });
//     }
// };


// export const refresh = async (req, res) => {
//     try {
//         const { refresh_token } = req.body;

//         // Validate refresh token
//         if (!refresh_token) {
//             return res.status(400).json({ error: "Refresh token is required" });
//         }

//         // Verify refresh token
//         let decoded;
//         try {
//             decoded = jwt.verify(refresh_token, REFRESH_TOKEN_SECRET);
//         } catch (error) {
//             return res.status(401).json({ error: "Invalid or expired refresh token" });
//         }

//         // Find user by ID and refresh token
//         const user = await User.findOne({ _id: decoded.id, refreshToken: refresh_token });
//         if (!user) {
//             return res.status(401).json({ error: "Invalid refresh token or user not found" });
//         }

//         // Generate new access token
//         const accessToken = generateJwtToken(user._id.toString(), user.email);

//         // Return success response
//         res.status(200).json({ access_token: accessToken });
//     } catch (error) {
//         console.error("Refresh token error:", error);
//         res.status(500).json({ error: "Server error: " + error.message });
//     }
// };

// export const logout = [
//     authenticateToken,
//     async (req, res) => {
//         try {
//             // Find user by ID from token
//             const user = await User.findById(req.user.id);
//             if (!user) {
//                 return res.status(404).json({ error: "User not found" });
//             }

//             // Clear refresh token
//             user.refreshToken = undefined;
//             await user.save();

//             // Return success response
//             res.status(204).send();
//         } catch (error) {
//             console.error("Logout error:", error);
//             res.status(500).json({ error: "Server error: " + error.message });
//         }
//     }
// ];

























export const signup = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            password,
            user_type,
            address,
            postCodes = []
        } = req.body;

        // Initialize response object
        const response = {
            message: "User registered successfully",
            user: {},
            warnings: []
        };

        // Validate required fields
        if (!first_name || !last_name || !email || !password || !user_type || !address) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        // Validate email and password using existing functions
        const { email: emailResult, password: passwordResult } = validateUserInput(email, password);
        if (!emailResult.isValid) {
            return res.status(400).json({ error: emailResult.message });
        }
        if (!passwordResult.isValid) {
            return res.status(400).json({ error: passwordResult.message });
        }

        // Validate user_type
        if (!["user", "specialist"].includes(user_type)) {
            return res.status(400).json({ error: "user_type must be 'user' or 'specialist'" });
        }

        // Validate phone (if provided)
        if (phone && !/^(?:\+[1-9]\d{1,14}|[0-9]\d{9,14})$/.test(phone)) {
            response.warnings.push("Invalid phone number format. Use local format (e.g., 08166489562) or international format (e.g., +2348166489562). Phone number saved but may need correction.");
        }

        // Validate address by attempting to geocode (non-blocking)
        let geocodingFailed = false;
        try {
            await getCoordinates(address, user_type === 'user' ? 'UK' : 'US');
        } catch (error) {
            console.error(`Geocoding error for address "${address}": ${error.message}`);
            response.warnings.push(`Address geocoding failed: ${error.message}. Address saved but may need verification.`);
            geocodingFailed = true;
        }

        // Check if email or phone already exists
        const existingUser = await User.findOne({ $or: [{ email }, phone ? { phone } : {}] });
        if (existingUser) {
            return res.status(400).json({ error: "Email or phone number already in use" });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Extract postcode from address (if applicable)
        const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
        const usZipRegex = /^\d{5}(-\d{4})?$/;
        let extractedPostcodes = [...postCodes];
        if (!geocodingFailed && (ukPostcodeRegex.test(address) || usZipRegex.test(address))) {
            extractedPostcodes.push(address);
        } else if (geocodingFailed || (!ukPostcodeRegex.test(address) && !usZipRegex.test(address))) {
            response.warnings.push("Address does not match expected postcode/zip code format. Saved as provided.");
        }

        // Create user
        const user = new User({
            first_name,
            last_name,
            email,
            phone,
            password: hashedPassword,
            user_type,
            address,
            postCodes: extractedPostcodes
        });

        await user.save();

        // Generate tokens
        const accessToken = generateJwtToken(user._id.toString(), email);
        const refreshToken = generateRefreshToken(user._id.toString(), email);

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save();

        // Populate user data in response
        response.user = {
            id: user._id,
            first_name,
            last_name,
            email,
            user_type,
            address
        };
        response.access_token = accessToken;
        response.refresh_token = refreshToken;

        // Return success response with warnings (if any)
        res.status(201).json(response);
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Validate email format
        const { email: emailResult } = validateUserInput(email, password);
        if (!emailResult.isValid) {
            return res.status(400).json({ error: emailResult.message });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate tokens
        const accessToken = generateJwtToken(user._id.toString(), email);
        const refreshToken = generateRefreshToken(user._id.toString(), email);

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save();

        // Return success response
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                user_type: user.user_type,
                address: user.address
            },
            access_token: accessToken,
            refresh_token: refreshToken
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};

export const refresh = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        // Validate refresh token
        if (!refresh_token) {
            return res.status(400).json({ error: "Refresh token is required" });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refresh_token, REFRESH_TOKEN_SECRET);
        } catch (error) {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }

        // Find user by ID and refresh token
        const user = await User.findOne({ _id: decoded.id, refreshToken: refresh_token });
        if (!user) {
            return res.status(401).json({ error: "Invalid refresh token or user not found" });
        }

        // Generate new access token
        const accessToken = generateJwtToken(user._id.toString(), user.email);

        // Return success response
        res.status(200).json({ access_token: accessToken });
    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};

export const logout = [
    authenticateToken,
    async (req, res) => {
        try {
            // Find user by ID from token
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Clear refresh token
            user.refreshToken = undefined;
            await user.save();

            // Return success response
            res.status(204).send();
        } catch (error) {
            console.error("Logout error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];



















// {
//     "message": "User registered successfully. Please verify your email.",
//     "user": {
//         "id": "507f1f77bcf86cd799439011",
//         "first_name": "John",
//         "last_name": "Doe",
//         "email": "john.doe@example.com",
//         "user_type": "user",
//         "address": "SW1A1AA"
//     },
//     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
//     "verificationCode": "1234"
// }




// {
//     "message": "User registered successfully. Warning: Failed to send verification email. Please try verifying later.",
//     "user": {
//         "id": "507f1f77bcf86cd799439011",
//         "first_name": "John",
//         "last_name": "Doe",
//         "email": "john.doe@example.com",
//         "user_type": "user",
//         "address": "SW1A1AA"
//     },
//     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
//     "emailWarning": "Failed to send verification email: ..."
// }