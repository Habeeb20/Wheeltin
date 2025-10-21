import express from "express"
import { createJob, deleteJob, getJob, getJobsByUser, updateJob } from "../../controllers/Job/jobControllers.js";

const jobRouter = express.Router()

jobRouter.post('/jobs', createJob);
jobRouter.get('/jobs/user/:userId', getJobsByUser);
jobRouter.get('/jobs/:jobId', getJob);
jobRouter.put('/jobs/:jobId', updateJob);
jobRouter.delete('/jobs/:jobId', deleteJob);


export default jobRouter