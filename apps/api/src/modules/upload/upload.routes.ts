import { Router } from 'express';
import { authenticateToken, requireSuperAdmin } from '../../middleware/auth.middleware';
import { uploadRateLimiter } from '../../middleware/rate-limit.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import { UploadController } from './upload.controller';

const router = Router();

// Endpoint for single file upload (key: 'file') - Authenticated with rate limit
router.post('/single', authenticateToken, uploadRateLimiter, uploadMiddleware.single('file'), UploadController.uploadSingle);

// Endpoint for multiple files upload (key: 'files', max 10 files) - Authenticated with rate limit
router.post('/multiple', authenticateToken, uploadRateLimiter, uploadMiddleware.array('files', 10), UploadController.uploadMultiple);

// Endpoint for resumable chunk upload - Authenticated with rate limit
router.post('/chunk', authenticateToken, uploadRateLimiter, uploadMiddleware.single('chunk'), UploadController.uploadChunk);

// Super Admin toggle S3 storage engine - Authenticated & Super Admin only
router.post('/s3-toggle', authenticateToken, requireSuperAdmin, UploadController.toggleS3);

export default router;
