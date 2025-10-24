import { authenticateToken, uploadToCloudinary, sendEmailVerification, sendReportNotification, sendQuotationNotification, getCoordinates } from '../../resources/functions.js';
import Report from '../../models/job/reportSchema.js';
import User from '../../models/user/userSchema.js';

export const createReport = [
    authenticateToken,
    async (req, res) => {
        try {
            const {
                carMaker, carModel, carYear, issueType, description, images, videos,
                mileage, contactEmail, carMakeOther, locationOther, urgency, location
            } = req.body;

            // Initialize response
            const response = {
                message: "Report created successfully",
                report: {},
                warnings: []
            };

            // Check email verification
            const user = await User.findById(req.user.id);
            if (!user.isVerified) {
                const verificationResult = await sendEmailVerification(user.email, user._id);
                if (!verificationResult.success) {
                    return res.status(403).json({ error: "Email not verified. Failed to send verification email: " + verificationResult.message });
                }
                return res.status(403).json({ error: "Email not verified. Verification email sent.", verificationToken: verificationResult.token });
            }

            // Validate required fields
            if (!carMaker || !carModel || !carYear || !issueType || !description || !images || !urgency || !location) {
                return res.status(400).json({ error: "All required fields must be provided" });
            }

            // Validate field lengths and types
            if (description.length > 2000) {
                return res.status(400).json({ error: "Description cannot exceed 2000 characters" });
            }
            if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
                return res.status(400).json({ error: "Images must be an array of 1 to 5 URLs" });
            }
            if (videos && (!Array.isArray(videos) || videos.length > 5)) {
                return res.status(400).json({ error: "Videos must be an array of 0 to 5 URLs" });
            }
            if (mileage && mileage < 0) {
                return res.status(400).json({ error: "Mileage cannot be negative" });
            }
            if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
                return res.status(400).json({ error: "Invalid contact email format" });
            }
            if (!["urgent", "normal", "flexible"].includes(urgency)) {
                return res.status(400).json({ error: "Urgency must be 'urgent', 'normal', or 'flexible'" });
            }
            if (carYear < 1900 || carYear > new Date().getFullYear() + 1) {
                return res.status(400).json({ error: `Car year must be between 1900 and ${new Date().getFullYear() + 1}` });
            }

            // Validate location geocoding (non-blocking)
            try {
                await getCoordinates(location, user.user_type === 'user' ? 'UK' : 'US');
            } catch (error) {
                console.error(`Geocoding error for location "${location}": ${error.message}`);
                response.warnings.push(`Location geocoding failed: ${error.message}. Location saved but may need verification.`);
            }

            // Create report with text data
            const report = new Report({
                carMaker,
                carModel,
                carYear,
                issueType,
                description,
                images: images, // Temporary, will be updated after Cloudinary upload
                videos: videos || [],
                mileage,
                contactEmail,
                carMakeOther: carMakeOther || undefined,
                locationOther: locationOther || undefined,
                urgency,
                location,
                userId: req.user.id,
                status: "pending"
            });

            await report.save();

            // Populate response with initial data
            response.report = {
                id: report._id,
                carMaker,
                carModel,
                carYear,
                issueType,
                description,
                images,
                videos: videos || [],
                mileage,
                contactEmail,
                carMakeOther,
                locationOther,
                urgency,
                location,
                userId: req.user.id,
                status: "pending"
            };

            // Notify specialists
            const specialists = await User.find({ user_type: "specialist" });
            specialists.forEach(async (specialist) => {
                await sendReportNotification(specialist.email, report._id, report.carMaker + " " + report.carModel);
            });

            // Emit real-time event
            req.io.emit('newReport', { reportId: report._id, title: report.carMaker + " " + report.carModel });

            // Asynchronously upload images and videos to Cloudinary
            Promise.all([
                uploadToCloudinary(images, 'image').then(result => {
                    if (result.success) {
                        report.images = result.urls;
                    } else {
                        response.warnings.push(result.message);
                    }
                }),
                videos && videos.length > 0 ? uploadToCloudinary(videos, 'video').then(result => {
                    if (result.success) {
                        report.videos = result.urls;
                    } else {
                        response.warnings.push(result.message);
                    }
                }) : Promise.resolve()
            ])
                .then(() => report.save())
                .catch(err => console.error("Failed to update Cloudinary URLs:", err));

            res.status(201).json(response);
        } catch (error) {
            console.error("Create report error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];



export const submitQuotation = [
    authenticateToken,
    async (req, res) => {
        try {
            const { reportId } = req.params;
            const { amount, duration, reasonForFault } = req.body;

            const report = await Report.findById(reportId);
            if (!report) {
                return res.status(404).json({ error: "Report not found" });
            }

            const user = await User.findById(req.user.id);
            if (user.user_type !== "specialist") {
                return res.status(403).json({ error: "Only specialists can submit quotations" });
            }

            if (!amount || amount < 0 || !duration || !reasonForFault) {
                return res.status(400).json({ error: "Amount, duration, and reason for fault are required" });
            }

            if (reasonForFault.length > 1000) {
                return res.status(400).json({ error: "Reason for fault cannot exceed 1000 characters" });
            }

            report.quotations.push({
                specialistId: req.user.id,
                amount,
                duration,
                reasonForFault
            });

            await report.save();

            // Notify user
            const reportUser = await User.findById(report.userId);
            await sendQuotationNotification(reportUser.email, reportId, report.carMaker + " " + report.carModel, user.name);

            // Emit real-time event
            req.io.to(report.userId.toString()).emit('newQuotation', {
                reportId,
                specialistId: req.user.id,
                amount,
                duration,
                reasonForFault
            });

            res.status(200).json({ message: "Quotation submitted successfully" });
        } catch (error) {
            console.error("Submit quotation error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];



export const acceptQuotation = [
    authenticateToken,
    async (req, res) => {
        try {
            const { reportId, specialistId } = req.params;
            const { date, time } = req.body;

            const report = await Report.findById(reportId);
            if (!report) {
                return res.status(404).json({ error: "Report not found" });
            }

            if (report.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized to accept quotations for this report" });
            }

            if (report.status !== "pending") {
                return res.status(400).json({ error: "Report is not in pending status" });
            }

            if (!date || !time) {
                return res.status(400).json({ error: "Date and time are required for appointment" });
            }

            if (isNaN(Date.parse(date))) {
                return res.status(400).json({ error: "Invalid date format" });
            }

            const quotation = report.quotations.find(q => q.specialistId.toString() === specialistId);
            if (!quotation) {
                return res.status(404).json({ error: "Quotation not found" });
            }

            report.selectedQuotation = specialistId;
            report.appointment = { date: new Date(date), time };
            report.status = "accepted";

            await report.save();

            // Notify specialist
            const specialist = await User.findById(specialistId);
            await sendQuotationNotification(specialist.email, reportId, report.carMaker + " " + report.carModel, "User");

            // Emit real-time event
            req.io.to(specialistId).emit('quotationAccepted', {
                reportId,
                userId: req.user.id,
                appointment: { date, time }
            });

            // Schedule status update to in-progress
            const appointmentDateTime = new Date(`${date}T${time}:00`);
            const delay = appointmentDateTime - Date.now();
            if (delay > 0) {
                setTimeout(async () => {
                    report.status = "in-progress";
                    await report.save();
                    req.io.emit('reportStatusUpdate', { reportId, status: "in-progress" });
                }, delay);
            }

            res.status(200).json({ message: "Quotation accepted and appointment scheduled" });
        } catch (error) {
            console.error("Accept quotation error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const completeReport = [
    authenticateToken,
    async (req, res) => {
        try {
            const { reportId } = req.params;

            const report = await Report.findById(reportId);
            if (!report) {
                return res.status(404).json({ error: "Report not found" });
            }

            if (report.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized to complete this report" });
            }

            if (report.status !== "in-progress") {
                return res.status(400).json({ error: "Report is not in in-progress status" });
            }

            report.status = "completed";
            await report.save();

            // Emit real-time event
            req.io.emit('reportStatusUpdate', { reportId, status: "completed" });

            res.status(200).json({ message: "Report marked as completed" });
        } catch (error) {
            console.error("Complete report error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const submitReview = [
    authenticateToken,
    async (req, res) => {
        try {
            const { reportId } = req.params;
            const { rating, comment, targetUserId } = req.body;

            const report = await Report.findById(reportId);
            if (!report) {
                return res.status(404).json({ error: "Report not found" });
            }

            if (report.status !== "completed") {
                return res.status(400).json({ error: "Report must be completed to submit a review" });
            }

            if (req.user.id !== report.userId.toString() && req.user.id !== report.selectedQuotation.toString()) {
                return res.status(403).json({ error: "Unauthorized to submit review for this report" });
            }

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ error: "Rating must be between 1 and 5" });
            }

            if (comment && comment.length > 500) {
                return res.status(400).json({ error: "Comment cannot exceed 500 characters" });
            }

            if (!targetUserId || (targetUserId !== report.userId.toString() && targetUserId !== report.selectedQuotation.toString())) {
                return res.status(400).json({ error: "Invalid target user ID" });
            }

            report.reviews.push({
                reviewerId: req.user.id,
                rating,
                comment
            });

            // Update specialist's profile with review
            await User.findByIdAndUpdate(targetUserId, {
                $push: { reviews: { rating, comment, reviewerId: req.user.id } }
            });

            await report.save();

            // Emit real-time event
            req.io.to(targetUserId).emit('newReview', { reportId, rating, comment, reviewerId: req.user.id });

            res.status(200).json({ message: "Review submitted successfully" });
        } catch (error) {
            console.error("Submit review error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const getReportsForSpecialist = [
    authenticateToken,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (user.user_type !== "specialist") {
                return res.status(403).json({ error: "Only specialists can view reports" });
            }

            const reports = await Report.find({ status: "pending" }).select('-__v');
            res.status(200).json({ reports });
        } catch (error) {
            console.error("Get reports for specialist error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const getUserReports = [
    authenticateToken,
    async (req, res) => {
        try {
            const { userId } = req.params;
            if (req.user.id !== userId) {
                return res.status(403).json({ error: "Unauthorized to access reports for this user" });
            }

            const reports = await Report.find({ userId }).select('-__v');
            res.status(200).json({ reports });
        } catch (error) {
            console.error("Get user reports error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const getReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const report = await Report.findById(reportId).select('-__v');
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }
        res.status(200).json({ report });
    } catch (error) {
        console.error("Get report error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};

// Real-time chat handler
export const setupChat = (io) => {
    io.on('connection', (socket) => {
        socket.on('joinRoom', ({ reportId, userId }) => {
            socket.join(reportId);
            console.log(`User ${userId} joined room ${reportId}`);
        });

        socket.on('sendMessage', async ({ reportId, senderId, message }) => {
            try {
                const report = await Report.findById(reportId);
                if (!report) {
                    socket.emit('error', { message: "Report not found" });
                    return;
                }

                if (senderId !== report.userId.toString() && senderId !== report.selectedQuotation?.toString()) {
                    socket.emit('error', { message: "Unauthorized to send message in this room" });
                    return;
                }

                io.to(reportId).emit('message', { senderId, message, timestamp: new Date() });
            } catch (error) {
                socket.emit('error', { message: "Server error: " + error.message });
            }
        });
    });
};