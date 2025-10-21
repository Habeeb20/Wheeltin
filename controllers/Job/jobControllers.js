import { authenticateToken,

    uploadToCloudinary, 
    generateUniqueNumber,
     getCoordinates
 } from '../../resources/functions.js';
import Job from '../../models/job/JobSchema.js';
import User from '../../models/user/userSchema.js';




export const createJob = [
    authenticateToken,
    async (req, res) => {
        try {
            const {
                title,
                description,
                category,
                images,
                postCode,
                address,
                budget_min,
                budget_max,
                urgency,
                preferred_date
            } = req.body;

            const response = {
                message: "Job created successfully",
                job: {},
                warnings: []
            };

            // Validate required fields
            if (!title || !description || !category || !images || !postCode || !address) {
                return res.status(400).json({ error: "All required fields must be provided" });
            }

            // Validate field lengths and types
            if (title.length > 200) {
                return res.status(400).json({ error: "Title cannot exceed 200 characters" });
            }
            if (description.length > 2000) {
                return res.status(400).json({ error: "Description cannot exceed 2000 characters" });
            }
            if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
                return res.status(400).json({ error: "Images must be an array of 1 to 5 URLs" });
            }
            if (urgency && !["urgent", "normal", "flexible"].includes(urgency)) {
                return res.status(400).json({ error: "Urgency must be 'urgent', 'normal', or 'flexible'" });
            }
            if (budget_min && budget_min < 0) {
                return res.status(400).json({ error: "Minimum budget cannot be negative" });
            }
            if (budget_max && budget_min && budget_max < budget_min) {
                return res.status(400).json({ error: "Maximum budget must be greater than or equal to minimum budget" });
            }
            if (preferred_date && isNaN(Date.parse(preferred_date))) {
                return res.status(400).json({ error: "Invalid preferred date format" });
            }

            // Validate address by attempting to geocode (non-blocking)
            let geocodingFailed = false;
            try {
                await getCoordinates(address, req.user.user_type === 'user' ? 'UK' : 'US');
            } catch (error) {
                console.error(`Geocoding error for address "${address}": ${error.message}`);
                response.warnings.push(`Address geocoding failed: ${error.message}. Address saved but may need verification.`);
                geocodingFailed = true;
            }

            // Validate postcode format (non-blocking)
            const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
            const usZipRegex = /^\d{5}(-\d{4})?$/;
            if (!geocodingFailed && !ukPostcodeRegex.test(postCode) && !usZipRegex.test(postCode)) {
                response.warnings.push("Postcode does not match expected format. Saved as provided.");
            }

            // Upload images to Cloudinary
            const uploadResult = await uploadToCloudinary(images);
            if (!uploadResult.success) {
                response.warnings.push(uploadResult.message);
            }
            const imageUrls = uploadResult.success ? uploadResult.urls : images;

            // Generate unique number automatically
            const uniqueNumber = generateUniqueNumber();

            // Create job
            const job = new Job({
                title,
                description,
                category,
                images: imageUrls,
                postCode,
                address,
                budget_min,
                budget_max,
                urgency,
                preferred_date: preferred_date ? new Date(preferred_date) : undefined,
                userId: req.user.id,
                uniqueNumber
            });

            await job.save();

            // Populate response
            response.job = {
                id: job._id,
                title,
                description,
                category,
                images: imageUrls,
                postCode,
                address,
                budget_min,
                budget_max,
                urgency,
                preferred_date,
                userId: req.user.id,
                uniqueNumber
            };

            res.status(201).json(response);
        } catch (error) {
            console.error("Create job error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const getJobsByUser = [
    authenticateToken,
    async (req, res) => {
        try {
            const { userId } = req.params;

            // Ensure authenticated user matches userId
            if (req.user.id !== userId) {
                return res.status(403).json({ error: "Unauthorized to access jobs for this user" });
            }

            const jobs = await Job.find({ userId }).select('-__v');
            res.status(200).json({ jobs });
        } catch (error) {
            console.error("Get jobs by user error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const getJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await Job.findById(jobId).select('-__v');
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }
        res.status(200).json({ job });
    } catch (error) {
        console.error("Get job error:", error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
};

export const updateJob = [
    authenticateToken,
    async (req, res) => {
        try {
            const { jobId } = req.params;
            const {
                title,
                description,
                category,
                images,
                postCode,
                address,
                budget_min,
                budget_max,
                urgency,
                preferred_date
            } = req.body;

            // Find job
            const job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({ error: "Job not found" });
            }

            // Ensure user owns the job
            if (job.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized to update this job" });
            }

            // Initialize response
            const response = {
                message: "Job updated successfully",
                job: {},
                warnings: []
            };

            // Validate fields (if provided)
            if (title && title.length > 200) {
                return res.status(400).json({ error: "Title cannot exceed 200 characters" });
            }
            if (description && description.length > 2000) {
                return res.status(400).json({ error: "Description cannot exceed 2000 characters" });
            }
            if (images && (!Array.isArray(images) || images.length < 1 || images.length > 5)) {
                return res.status(400).json({ error: "Images must be an array of 1 to 5 URLs" });
            }
            if (urgency && !["urgent", "normal", "flexible"].includes(urgency)) {
                return res.status(400).json({ error: "Urgency must be 'urgent', 'normal', or 'flexible'" });
            }
            if (budget_min && budget_min < 0) {
                return res.status(400).json({ error: "Minimum budget cannot be negative" });
            }
            if (budget_max && budget_min && budget_max < budget_min) {
                return res.status(400).json({ error: "Maximum budget must be greater than or equal to minimum budget" });
            }
            if (preferred_date && isNaN(Date.parse(preferred_date))) {
                return res.status(400).json({ error: "Invalid preferred date format" });
            }

            // Upload new images to Cloudinary if provided
            let updatedImageUrls = job.images;
            if (images && images.length > 0) {
                const uploadResult = await uploadToCloudinary(images);
                if (!uploadResult.success) {
                    response.warnings.push(uploadResult.message);
                } else {
                    updatedImageUrls = uploadResult.urls;
                }
            }

            // Validate address geocoding if address is updated (non-blocking)
            if (address && address !== job.address) {
                try {
                    await getCoordinates(address, req.user.user_type === 'user' ? 'UK' : 'US');
                } catch (error) {
                    console.error(`Geocoding error for updated address "${address}": ${error.message}`);
                    response.warnings.push(`Address geocoding failed: ${error.message}. Address saved but may need verification.`);
                }
            }

            // Validate postcode format if updated (non-blocking)
            if (postCode && postCode !== job.postCode) {
                const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
                const usZipRegex = /^\d{5}(-\d{4})?$/;
                if (!ukPostcodeRegex.test(postCode) && !usZipRegex.test(postCode)) {
                    response.warnings.push("Postcode does not match expected format. Saved as provided.");
                }
            }

            // Update job
            const updatedJob = await Job.findByIdAndUpdate(
                jobId,
                {
                    title: title || job.title,
                    description: description || job.description,
                    category: category || job.category,
                    images: updatedImageUrls,
                    postCode: postCode || job.postCode,
                    address: address || job.address,
                    budget_min: budget_min !== undefined ? budget_min : job.budget_min,
                    budget_max: budget_max !== undefined ? budget_max : job.budget_max,
                    urgency: urgency || job.urgency,
                    preferred_date: preferred_date ? new Date(preferred_date) : job.preferred_date
                },
                { new: true, runValidators: true }
            ).select('-__v');

            // Populate response
            response.job = {
                id: updatedJob._id,
                title: updatedJob.title,
                description: updatedJob.description,
                category: updatedJob.category,
                images: updatedJob.images,
                postCode: updatedJob.postCode,
                address: updatedJob.address,
                budget_min: updatedJob.budget_min,
                budget_max: updatedJob.budget_max,
                urgency: updatedJob.urgency,
                preferred_date: updatedJob.preferred_date,
                userId: updatedJob.userId,
                uniqueNumber: updatedJob.uniqueNumber
            };

            res.status(200).json(response);
        } catch (error) {
            console.error("Update job error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];

export const deleteJob = [
    authenticateToken,
    async (req, res) => {
        try {
            const { jobId } = req.params;

            // Find job
            const job = await Job.findById(jobId);
            if (!job) {
                return res.status(404).json({ error: "Job not found" });
            }

            // Ensure user owns the job
            if (job.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized to delete this job" });
            }

            // Delete job
            await Job.findByIdAndDelete(jobId);

            res.status(200).json({ message: "Job deleted successfully" });
        } catch (error) {
            console.error("Delete job error:", error);
            res.status(500).json({ error: "Server error: " + error.message });
        }
    }
];