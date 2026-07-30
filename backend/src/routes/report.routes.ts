import { Router } from 'express';
import * as reportController from '../controllers/report.controller';

export const reportRouter = Router();

reportRouter.get('/history', reportController.getReportHistory);
reportRouter.post('/generate', reportController.generateReport);
reportRouter.post('/generate-all', reportController.generateAllReport);
reportRouter.post('/generate-custom', reportController.generateCustomReport);
