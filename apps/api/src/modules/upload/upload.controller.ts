import { Request, Response } from 'express';
import path from 'path';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

export class UploadController {
  // Helper to extract relative URL path from disk destination
  private static getPublicFileUrl(req: Request, file: Express.Multer.File): string {
    const fileType = file.mimetype.startsWith('video/')
      ? 'videos'
      : file.mimetype.startsWith('image/')
      ? 'images'
      : file.mimetype.startsWith('audio/')
      ? 'audios'
      : 'documents';
    // Match destination path after "uploads/"
    const relativePath =
      file.destination.replace(/\\/g, '/').split('/uploads/')[1] || `users/general/${fileType}`;

    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const serverUrl = process.env.SERVER_URL || `${protocol}://${host}`;

    return `${serverUrl.replace(/\/$/, '')}/uploads/${relativePath}/${file.filename}`;
  }

  // Handle Single File Upload
  static uploadSingle(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const fileUrl = UploadController.getPublicFileUrl(req, req.file);

      res.status(201).json({
        message: 'File uploaded successfully',
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Handle Multiple Files Upload (Up to 10 files)
  static uploadMultiple(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
      }

      const fileDetails = files.map((file) => {
        const url = UploadController.getPublicFileUrl(req, file);
        return {
          url,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        };
      });

      res.status(201).json({
        message: `${fileDetails.length} files uploaded successfully`,
        files: fileDetails,
        urls: fileDetails.map((f) => f.url),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Handle Resumable Chunk Upload
  static async uploadChunk(req: Request, res: Response) {
    try {
      const { uploadId, chunkIndex, totalChunks, fileName } = req.body;
      const file = req.file;

      if (!file || !uploadId || chunkIndex === undefined || !totalChunks || !fileName) {
        return res.status(400).json({ error: 'uploadId, chunkIndex, totalChunks, fileName, and chunk file are required' });
      }

      const { StorageService } = await import('./storage.service');
      const result = await StorageService.handleChunkUpload({
        uploadId,
        chunkIndex: Number(chunkIndex),
        totalChunks: Number(totalChunks),
        fileName,
        buffer: file.buffer || require('fs').readFileSync(file.path),
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Super Admin Toggle S3 CDN Engine
  static async toggleS3(req: Request, res: Response) {
    try {
      const { enabled, bucketName } = req.body;
      const { StorageService } = await import('./storage.service');
      const result = await StorageService.toggleS3Storage(Boolean(enabled), bucketName);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
