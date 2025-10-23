

import express from 'express';
import { createReport, submitQuotation, acceptQuotation, completeReport, submitReview, getReportsForSpecialist, getUserReports, getReport  } from '../../controllers/Job/ReportController.js';


const reportRouter = express.Router();

 reportRouter.post('/', createReport);
 reportRouter.post('/postreports/:reportId/quotations', submitQuotation);
 reportRouter.post('/:reportId/accept/:specialistId', acceptQuotation);
 reportRouter.post('/:reportId/complete', completeReport);
 reportRouter.post('/:reportId/reviews', submitReview);
 reportRouter.get('/getreports/specialist', getReportsForSpecialist);
 reportRouter.get('/user/:userId', getUserReports);
 reportRouter.get('/:reportId', getReport);

export default  reportRouter;