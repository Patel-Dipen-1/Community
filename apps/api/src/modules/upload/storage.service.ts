import { prisma } from '@b2b/database';
import fs from 'fs';
import path from 'path';

export class StorageService {
  /**
   * Save uploaded chunk to local temp folder & assemble when all chunks arrive
   */
  static async handleChunkUpload(data: {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    fileName: string;
    buffer: Buffer;
  }) {
    const tempDir = path.join(__dirname, '../../../scratch/chunks', data.uploadId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, `chunk_${data.chunkIndex}`);
    fs.writeFileSync(chunkPath, data.buffer);

    // Check if all chunks have been received
    const files = fs.readdirSync(tempDir);
    if (files.length === data.totalChunks) {
      // Assemble full file
      const uploadsDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExt = path.extname(data.fileName) || '.bin';
      const finalFileName = `assembled_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;
      const finalFilePath = path.join(uploadsDir, finalFileName);

      const writeStream = fs.createWriteStream(finalFilePath);
      for (let i = 0; i < data.totalChunks; i++) {
        const partPath = path.join(tempDir, `chunk_${i}`);
        if (fs.existsSync(partPath)) {
          const partData = fs.readFileSync(partPath);
          writeStream.write(partData);
          fs.unlinkSync(partPath);
        }
      }
      writeStream.end();

      // Clean up temp directory
      try {
        fs.rmdirSync(tempDir);
      } catch (err) {}

      // Check system setting for S3 storage
      const setting = await prisma.systemSetting.findUnique({ where: { id: 'default' } });
      const useS3 = setting?.s3StorageEnabled || false;

      if (useS3) {
        // Return simulated S3 CDN URL
        return {
          isComplete: true,
          storage: 'S3_CDN',
          fileUrl: `https://${setting?.s3BucketName || 'b2b-media-uploads'}.s3.amazonaws.com/${finalFileName}`,
        };
      }

      return {
        isComplete: true,
        storage: 'LOCAL_DISK',
        fileUrl: `/uploads/${finalFileName}`,
      };
    }

    return {
      isComplete: false,
      receivedChunks: files.length,
      totalChunks: data.totalChunks,
    };
  }

  /**
   * Admin Toggle S3 Storage Engine
   */
  static async toggleS3Storage(enabled: boolean, bucketName?: string) {
    const updated = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        s3StorageEnabled: enabled,
        ...(bucketName && { s3BucketName: bucketName }),
      },
      create: {
        id: 'default',
        s3StorageEnabled: enabled,
        s3BucketName: bucketName || 'b2b-media-uploads',
      },
    });

    return {
      s3StorageEnabled: updated.s3StorageEnabled,
      s3BucketName: updated.s3BucketName,
      message: `S3 CDN storage engine ${enabled ? 'ENABLED' : 'DISABLED'} by Super Admin.`,
    };
  }
}
