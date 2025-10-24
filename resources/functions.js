





















import nodemailer from "nodemailer";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import axios from "axios";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import cloudinary from "cloudinary";
import User from "../models/user/userSchema.js"
dotenv.config();



const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const EMAIL_USER = process.env.EMAIL_USER || "codequor@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "jflsxcdlycnmnsso";
const GOOGLE_KEY = process.env.GOOGLE_KEY;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});



export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: "Invalid email format" };
    }
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
    const domain = email.split('@')[1].toLowerCase();
    if (!commonDomains.includes(domain)) {
        console.warn(`Domain ${domain} is not a common email provider. Consider verifying.`);
    }
    return { isValid: true, message: "Email format is valid" };
};


export const validatePassword = (password) => {
    // Ensure at least one uppercase, one digit, and minimum 8 characters (allowing special characters)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        return {
            isValid: false,
            message: "Password must be at least 8 characters long, contain at least 1 uppercase letter, and 1 number"
        };
    }
    return { isValid: true, message: "Password is strong" };
};





export const validateUserInput = (email, password) => {
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    return {
        email: emailResult,
        password: passwordResult
    };
};

export async function hashPassword(password) {
    try {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        console.log(error);
        throw new Error("password hashing failed: " + error.message);
    }
}

export async function verifyPassword(password, hashedPassword) {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        throw new Error("password verification failed: " + error.message);
    }
}

export function generate4DigitCode() {
    try {
        return crypto.randomInt(0, 10000).toString().padStart(4, '0');
    } catch (error) {
        throw new Error('generating 4 digit code failed: ' + error.message);
    }
}

export async function sendEmailVerificationCode(email, code) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Wheetin" <${EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your Email',
            text: `Your verification code is: ${code}`,
            html: `<p>Your verification code is: <strong>${code}</strong></p>`,
        });
        return { success: true, message: "Verification email sent successfully" };
    } catch (error) {
        console.error("Failed to send verification email:", error);
        return { success: false, message: `Failed to send verification email: ${error.message}` };
    }
}

export const validateEmailVerificationInput = [
    body('email').isEmail().withMessage('Invalid email address'),
    body('code').isLength({ min: 4, max: 4 }).withMessage('Code must be 4 digits'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

export function generateJwtToken(userId, email) {
    try {
        return jwt.sign({ id: userId, email: email }, JWT_SECRET, { expiresIn: "7d" });
    } catch (error) {
        throw new Error("token generation failed: " + error.message);
    }
}


export function generateRefreshToken(userId, email) {
    try {
        return jwt.sign({ id: userId, email: email }, REFRESH_TOKEN_SECRET, { expiresIn: "30d" });
    } catch (error) {
        throw new Error("refresh token generation failed: " + error.message);
    }
}

export async function authenticateToken(req, res, next) {
  // Access header in a case-insensitive way
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader) {
    console.log('No authorization header provided:', req.headers);
    return res.status(401).json({ error: 'Access token required' });
  }

  // Extract token: handle both "Bearer <token>" and raw token
  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = authHeader; // Fallback for raw token
  }

  if (!token) {
    console.log('No token extracted from header:', req.headers);
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('passwordChangedAt');

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if password was changed after token issuance
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      return res.status(401).json({ error: 'Token invalid: Password changed' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message, 'Token:', token);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (degrees) => degrees * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 0.621371).toFixed(2);
}

export async function getCoordinates(input, country = 'UK') {
    try {
        if (country === 'UK') {
            const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
            if (ukPostcodeRegex.test(input)) {
                const response = await axios.get(`https://api.postcodes.io/postcodes/${input}`);
                if (response.data.status === 200) {
                    return {
                        lat: response.data.result.latitude,
                        lon: response.data.result.longitude
                    };
                }
            }
        }
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: input,
                key: GOOGLE_KEY
            }
        });
        if (response.data.status === 'OK') {
            return response.data.results[0].geometry.location;
        }
        throw new Error('Geocoding failed');
    } catch (error) {
        throw new Error(`Geocoding error for ${input}: ${error.message}`);
    }
}

export async function calculateDistance(userInput, providerInput, userCountry = 'UK', providerCountry = 'UK') {
    try {
        if (!userInput || !providerInput) {
            return { isValid: false, message: 'Both user and provider inputs are required' };
        }
        const userCoords = await getCoordinates(userInput, userCountry);
        const providerCoords = await getCoordinates(providerInput, providerCountry);
        const distance = haversineDistance(
            userCoords.lat,
            userCoords.lon,
            providerCoords.lat,
            providerCoords.lon
        );
        return {
            isValid: true,
            distance: distance,
            message: `Distance between ${userInput} and ${providerInput}: ${distance} miles`
        };
    } catch (error) {
        return { isValid: false, message: `Error: ${error.message}` };
    }
}

export async function validateAndCalculate(userEmail, userPassword, userInput, providerInput, userCountry = 'UK', providerCountry = 'UK') {
    const emailResult = validateEmail(userEmail);
    const passwordResult = validatePassword(userPassword);
    const distanceResult = await calculateDistance(userInput, providerInput, userCountry, providerCountry);
    return {
        email: emailResult,
        password: passwordResult,
        distance: distanceResult
    };
}









export function generateResetToken() {
    try {
        return crypto.randomBytes(32).toString('hex');
    } catch (error) {
        throw new Error("reset token generation failed: " + error.message);
    }
}

// export async function sendPasswordResetEmail(email, token) {
//     try {
//         const transporter = nodemailer.createTransport({
//             service: 'gmail',
//             auth: {
//                 user: EMAIL_USER,
//                 pass: EMAIL_PASS,
//             },
//         });

//         const resetUrl = `https://wheelitin.taskflow.com.ng/reset-password?token=${token}`;
//         await transporter.sendMail({
//             from: `"wheelitin" <${EMAIL_USER}>`,
//             to: email,
//             subject: 'Reset Your Password',
//             text: `Click the following link to reset your password: ${resetUrl}`,
//             html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
//         });
//         console.log("Password reset email sent successfully, please check your mail " )
//         return { success: true, message: "Password reset email sent successfully, please check your mail " };
//     } catch (error) {
//         console.error("Failed to send password reset email:", error);
//         return { success: false, message: `Failed to send password reset email: ${error.message}` };
//     }
// }



export async function sendPasswordResetEmail(email, token) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const resetUrl = `https://wheelitin.taskflow.com.ng/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        await transporter.sendMail({
            from: `"WheelItIn" <${EMAIL_USER}>`,
            to: email,
            subject: 'Reset Your Password',
            text: `Click the following link to reset your password: ${resetUrl}`,
            html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
        });
        console.log("Password reset email sent successfully to", email);
        return { success: true, message: "Password reset email sent successfully, please check your mail" };
    } catch (error) {
        console.error("Failed to send password reset email:", error.message);
        return { success: false, message: `Failed to send password reset email: ${error.message}` };
    }
}







export function generateUniqueNumber() {
    try {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex');
        return `${timestamp}-${random}`;
    } catch (error) {
        throw new Error("unique number generation failed: " + error.message);
    }
}




///send email notifications


export async function sendEmailVerification(email, userId) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationUrl = `https://wheelitin.taskflow.com.ng/verify-email?token=${verificationToken}&userId=${userId}`;
        await transporter.sendMail({
            from: `"wheelitin" <${EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your Email for Service Report',
            text: `Please verify your email by clicking: ${verificationUrl}`,
            html: `<p>Please verify your email to submit service reports: <a href="${verificationUrl}">Verify Email</a></p>`
        });
        return { success: true, token: verificationToken, message: "Verification email sent successfully" };
    } catch (error) {
        console.error("Failed to send verification email:", error);
        return { success: false, message: `Failed to send verification email: ${error.message}` };
    }
}

export async function sendReportNotification(email, reportId, reportTitle) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const reportUrl = `https://wheelitin.taskflow.com.ng/reports/${reportId}`;
        await transporter.sendMail({
            from: `"wheelitin" <${EMAIL_USER}>`,
            to: email,
            subject: `New Service Report: ${reportTitle}`,
            text: `A new service report has been posted: ${reportTitle}. View details: ${reportUrl}`,
            html: `<p>A new service report has been posted: <strong>${reportTitle}</strong>. <a href="${reportUrl}">View Details</a></p>`
        });
        return { success: true, message: "Notification email sent successfully" };
    } catch (error) {
        console.error("Failed to send notification email:", error);
        return { success: false, message: `Failed to send notification email: ${error.message}` };
    }
}












export async function sendQuotationNotification(email, reportId, reportTitle, specialistName, specialistEmail, amount, duration, reasonForFault) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const acceptUrl = `https://wheelitin.taskflow.com.ng/reports/${reportId}/accept?specialistId=${encodeURIComponent(specialistEmail)}`;
        const declineUrl = `https://wheelitin.taskflow.com.ng/reports/${reportId}/decline?specialistId=${encodeURIComponent(specialistEmail)}`;
        await transporter.sendMail({
            from: `"WheelItIn" <${EMAIL_USER}>`,
            to: email,
            subject: `New Quotation for Your Report: ${reportTitle}`,
            text: `${specialistName} (${specialistEmail}) has submitted a quotation for your report: ${reportTitle}.\nAmount: $${amount}\nDuration: ${duration}\nReason for Fault: ${reasonForFault}\nAccept: ${acceptUrl}\nDecline: ${declineUrl}`,
            html: `
                <p><strong>${specialistName}</strong> (${specialistEmail}) has submitted a quotation for your report: <strong>${reportTitle}</strong>.</p>
                <ul>
                    <li><strong>Amount:</strong> $${amount}</li>
                    <li><strong>Duration:</strong> ${duration}</li>
                    <li><strong>Reason for Fault:</strong> ${reasonForFault}</li>
                </ul>
                <p>
                    <a href="${acceptUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Quotation</a>
                    <a href="${declineUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline Quotation</a>
                </p>
                <p><a href="https://wheelitin.taskflow.com.ng/reports/${reportId}">View Report Details</a></p>
            `
        });
        return { success: true, message: "Quotation notification email sent successfully" };
    } catch (error) {
        console.error("Failed to send quotation notification email:", error.message);
        return { success: false, message: `Failed to send quotation notification email: ${error.message}` };
    }
}

export async function sendQuotationAcceptedNotification(specialistEmail, reportId, reportTitle, userName, userEmail, amount, duration, reasonForFault, appointmentDate, appointmentTime) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const reportUrl = `https://wheelitin.taskflow.com.ng/reports/${reportId}`;
        await transporter.sendMail({
            from: `"WheelItIn" <${EMAIL_USER}>`,
            to: specialistEmail,
            subject: `Your Quotation for ${reportTitle} Has Been Accepted`,
            text: `${userName} (${userEmail}) has accepted your quotation for the report: ${reportTitle}.\nAmount: $${amount}\nDuration: ${duration}\nReason for Fault: ${reasonForFault}\nAppointment: ${appointmentDate} at ${appointmentTime}\nView details: ${reportUrl}`,
            html: `
                <p><strong>${userName}</strong> (${userEmail}) has accepted your quotation for the report: <strong>${reportTitle}</strong>.</p>
                <ul>
                    <li><strong>Amount:</strong> $${amount}</li>
                    <li><strong>Duration:</strong> ${duration}</li>
                    <li><strong>Reason for Fault:</strong> ${reasonForFault}</li>
                    <li><strong>Appointment:</strong> ${appointmentDate} at ${appointmentTime}</li>
                </ul>
                <p><a href="${reportUrl}">View Report Details</a></p>
            `
        });
        return { success: true, message: "Quotation accepted notification email sent successfully" };
    } catch (error) {
        console.error("Failed to send quotation accepted notification email:", error.message);
        return { success: false, message: `Failed to send quotation accepted notification email: ${error.message}` };
    }
}







export async function sendQuotationDeclinedNotification(specialistEmail, reportId, reportTitle, userName) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        const reportUrl = `https://wheelitin.taskflow.com.ng/reports/${reportId}`;
        await transporter.sendMail({
            from: `"WheelItIn" <${EMAIL_USER}>`,
            to: specialistEmail,
            subject: `Your Quotation for ${reportTitle} Has Been Declined`,
            text: `${userName} has declined your quotation for the report: ${reportTitle}.\nView details: ${reportUrl}`,
            html: `
                <p><strong>${userName}</strong> has declined your quotation for the report: <strong>${reportTitle}</strong>.</p>
                <p><a href="${reportUrl}">View Report Details</a></p>
            `
        });
        return { success: true, message: "Quotation declined notification email sent successfully" };
    } catch (error) {
        console.error("Failed to send quotation declined notification email:", error.message);
        return { success: false, message: `Failed to send quotation declined notification email: ${error.message}` };
    }
}











export async function uploadToCloudinary(media, type = 'image') {
    try {
        const uploadPromises = media.map(async (item) => {
            const result = await cloudinary.v2.uploader.upload(item, {
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                folder: `jobs/${type}s`,
                resource_type: type
            });
            return result.secure_url;
        });
        const urls = await Promise.all(uploadPromises);
        return { success: true, urls };
    } catch (error) {
        console.error(`Cloudinary ${type} upload failed:`, error);
        return { success: false, message: `Cloudinary ${type} upload failed: ${error.message}` };
    }
}

































































