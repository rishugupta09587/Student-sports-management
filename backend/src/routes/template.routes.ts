import { Router } from 'express';
import * as templateController from '../controllers/template.controller';
import { uploadDocx } from '../middleware/upload';

export const templateRouter = Router();

templateRouter.get('/', templateController.getTemplates);
templateRouter.post('/', uploadDocx.single('template'), templateController.uploadTemplate);
templateRouter.get('/:id', templateController.getTemplate);
templateRouter.delete('/:id', templateController.deleteTemplate);
templateRouter.post('/:id/generate', templateController.renderTemplate);
