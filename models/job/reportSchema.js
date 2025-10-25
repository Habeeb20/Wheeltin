import mongoose from "mongoose";



const reviewSchema = new mongoose.Schema({
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500, trim: true },
    createdAt: { type: Date, default: Date.now }
});

const quotationSchema = new mongoose.Schema({
    specialistId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, min: 0, required: true },
    duration: { type: String, required: true }, // e.g., "2 days"
    reasonForFault: { type: String, maxlength: 1000, required: true },
    createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    time: { type: String, required: true } // e.g., "14:00"
});

const reportSchema = new mongoose.Schema({
    carMaker: { type: String, required: [true, "Car maker is required"], trim: true },
    carModel: { type: String, required: [true, "Car model is required"], trim: true },
    carYear: { type: Number, required: [true, "Car year is required"], min: 1900, max: new Date().getFullYear() + 1 },
    issueType: { type: String, required: [true, "Issue type is required"], trim: true },
    description: { type: String, required: [true, "Description is required"], maxlength: [2000, "Description cannot exceed 2000 characters"], trim: true },
    images: {
        type: [String],
        required: [true, "At least one image is required"],
        validate: {
            validator: (arr) => arr.length >= 1 && arr.length <= 5,
            message: "Images array must contain 1 to 5 URLs"
        }
    },
    videos: {
        type: [String],
        default: [],
        validate: {
            validator: (arr) => arr.length <= 5,
            message: "Videos array cannot exceed 5 URLs"
        }
    },
    mileage: { type: Number, min: 0, required: false },
    contactEmail: { type: String, trim: true, required: false },
    carMakeOther: { type: String, trim: true, required: false },
    locationOther: { type: String, trim: true, required: false },
    urgency: {
        type: String,
        enum: ["urgent", "very urgent", "not really urgent"],
        required: [true, "Urgency is required"]
    },
    location: { type: String, required: [true, "Location is required"], trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: [true, "User ID is required"] },
    status: {
        type: String,
        enum: ["pending", "accepted", "in-progress", "completed"],
        default: "pending"
    },
    quotations: [quotationSchema],
    selectedQuotation: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Specialist who won the job
    appointment: { type: appointmentSchema, required: false },
    reviews: [reviewSchema]
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);






























































































