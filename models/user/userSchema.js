




import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500, trim: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
});




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
        enum: ["user", "specialist", "admin"],
        default: "user"
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
    },
        passwordChangedAt: { type: Date },
    reviews: [reviewSchema]

});

export default mongoose.model("User", userSchema);











