import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type FileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void;

const imageFilter: FileFilter = (_req, file, cb) => {
  if (!IMAGE_TYPES.has(file.mimetype)) {
    cb(new ApiError(400, 'Only JPEG, PNG, WEBP or GIF images are allowed'));
    return;
  }
  cb(null, true);
};

const docxFilter: FileFilter = (_req, file, cb) => {
  if (file.mimetype !== DOCX_TYPE && !file.originalname.toLowerCase().endsWith('.docx')) {
    cb(new ApiError(400, 'Only .docx files are allowed'));
    return;
  }
  cb(null, true);
};

const csvFilter: FileFilter = (_req, file, cb) => {
  if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
    cb(new ApiError(400, 'Only .csv files are allowed'));
    return;
  }
  cb(null, true);
};

export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: docxFilter,
});

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: csvFilter,
});
