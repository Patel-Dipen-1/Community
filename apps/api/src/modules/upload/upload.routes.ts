import { Router } from 'express';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { UploadController } from './upload.controller';

const router = Router();

// Endpoint for single file upload (key: 'file')
router.post('/single', uploadMiddleware.single('file'), UploadController.uploadSingle);

// Endpoint for multiple files upload (key: 'files', max 10 files)
router.post('/multiple', uploadMiddleware.array('files', 10), UploadController.uploadMultiple);

// Endpoint for resumable chunk upload
router.post('/chunk', uploadMiddleware.single('chunk'), UploadController.uploadChunk);

// Super Admin toggle S3 storage engine
router.post('/s3-toggle', UploadController.toggleS3);

export default router;
