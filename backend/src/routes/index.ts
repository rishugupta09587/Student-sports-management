import { Router } from 'express';
import { studentRouter } from './student.routes';
import { reportRouter } from './report.routes';
import { templateRouter } from './template.routes';
import { dashboardRouter } from './dashboard.routes';

export const apiRouter = Router();

apiRouter.use('/students', studentRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/templates', templateRouter);
apiRouter.use('/dashboard', dashboardRouter);
