import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        maxlength: [200, "Title cannot exceed 200 characters"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Description is required"],
        maxlength: [2000, "Description cannot exceed 2000 characters"],
        trim: true
    },
    category: {
        type: String,
        required: [true, "Category is required"],
        trim: true
    },
    images: {
        type: [String],
        required: [true, "At least one image is required"],
        validate: {
            validator: (arr) => arr.length >= 1 && arr.length <= 5,
            message: "Images array must contain 1 to 5 images"
        }
    },
    postCode: {
        type: String,
        required: [true, "Postcode is required"],
        trim: true
    },
    address: {
        type: String,
        required: [true, "Address is required"],
        trim: true
    },
    budget_min: {
        type: Number,
        min: [0, "Minimum budget cannot be negative"],
        required: false
    },
    budget_max: {
        type: Number,
        validate: {
            validator: function (value) {
                return !this.budget_min || value >= this.budget_min;
            },
            message: "Maximum budget must be greater than or equal to minimum budget"
        },
        required: false
    },
    urgency: {
        type: String,
        enum: {
            values: ["urgent", "normal", "flexible"],
            message: "Urgency must be 'urgent', 'normal', or 'flexible'"
        },
        required: false
    },
    preferred_date: {
        type: Date,
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"]
    },
    uniqueNumber: {
        type: String,
        required: [true, "Unique number is required"],
        unique: true
    }
}, { timestamps: true });

export default mongoose.model("Job", jobSchema);