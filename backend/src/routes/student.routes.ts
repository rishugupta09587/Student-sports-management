import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { uploadCsv, uploadPhoto } from '../middleware/upload';

export const studentRouter = Router();

studentRouter.get('/export', studentController.exportStudents);
studentRouter.post('/import', uploadCsv.single('file'), studentController.importStudents);

studentRouter.get('/', studentController.getStudents);
studentRouter.post('/', uploadPhoto.single('photo'), studentController.createStudent);
studentRouter.get('/:id', studentController.getStudent);
studentRouter.put('/:id', uploadPhoto.single('photo'), studentController.updateStudent);
studentRouter.delete('/:id', studentController.deleteStudent);
