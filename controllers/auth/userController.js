

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
    hashPassword,
    generateResetToken,
    sendPasswordResetEmail
} from '../../resources/functions.js';
import jwt  from "jsonwebtoken"
import User from '../../models/user/userSchema.js';

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;



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





export const dashboard = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }

        const userId = req.user.id;
        const user = await User.findOne({ _id: userId }).select('-password -resetPasswordToken -verificationToken -__v');

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error("Dashboard error:", error.message);
        return res.status(500).json({ error: `Server error: ${error.message}` });
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








export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        const { email: emailResult } = validateUserInput(email, "DummyPassword123");
        if (!emailResult.isValid) {
            return res.status(400).json({ error: emailResult.message });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Return success to avoid leaking user existence
            return res.status(200).json({ message: "Password reset email sent successfully" });
        }

        // Generate reset token and expiration
        const resetToken = generateResetToken();
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send reset email (non-blocking)
        const emailResults = await sendPasswordResetEmail(email, resetToken);
        const response = { message: "Password reset email sent successfully" };
        if (!emailResults.success) {
            response.warnings = [`Failed to send password reset email: ${emailResults.message}`];
        }

        res.status(200).json(response);
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validate inputs
        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password are required" });
        }

        // Validate password
        const { password: passwordResult } = validateUserInput("dummy@example.com", newPassword);
        if (!passwordResult.isValid) {
            return res.status(400).json({ error: passwordResult.message });
        }

        // Find user by reset token and check expiration
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};








export const changePassword = [
    authenticateToken,
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            // Validate input
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: "Current and new passwords are required" });
            }

            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({ error: passwordValidation.message });
            }

            // Find user
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Verify current password
            const isMatch = await verifyPassword(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: "Current password is incorrect" });
            }

            // Check if new password is same as current
            if (await verifyPassword(newPassword, user.password)) {
                return res.status(400).json({ error: "New password cannot be the same as the current password" });
            }

            // Hash new password
            user.password = await hashPassword(newPassword);
            user.passwordChangedAt = new Date(); // Invalidate existing JWTs

            await user.save();

            // Emit real-time event (optional, for user logout on other devices)
            req.io.to(req.user.id).emit('passwordChanged', { message: "Password changed, please log in again" });

            return res.status(200).json({ message: "Password changed successfully" });
        } catch (error) {
            console.error("Change password error:", error.message);
            return res.status(500).json({ error: `Server error: ${error.message}` });
        }
    }
];




