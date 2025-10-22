

import express from 'express';
import { createReport, submitQuotation, acceptQuotation, completeReport, submitReview, getReportsForSpecialist, getUserReports, getReport  } from '../../controllers/Job/ReportController.js';


const reportRouter = express.Router();

 reportRouter.post('/reports', createReport);
 reportRouter.post('/reports/:reportId/quotations', submitQuotation);
 reportRouter.post('/reports/:reportId/accept/:specialistId', acceptQuotation);
 reportRouter.post('/reports/:reportId/complete', completeReport);
 reportRouter.post('/reports/:reportId/reviews', submitReview);
 reportRouter.get('/reports/specialist', getReportsForSpecialist);
 reportRouter.get('/reports/user/:userId', getUserReports);
 reportRouter.get('/reports/:reportId', getReport);

export default  reportRouter;