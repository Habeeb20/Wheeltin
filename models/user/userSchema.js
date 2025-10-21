




import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
    },
    phone: {
        type: String,
        unique: true,
    
        required: false
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        match: /^(?=.*[A-Z])(?=.*\d).{8,}$/
    },
    user_type: {
        type: String,
        required: true,
        enum: ["user", "specialist"]
    },
    address: {
        type: String,
        required: true
    },
    postCodes: {
        type: [String],
        default: []
    },
    verificationCode: {
        type: String,
        required: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String,
        required: false
    },
      resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    }

});

export default mongoose.model("User", userSchema);