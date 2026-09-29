import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadBaseDir = path.join(__dirname, '../../uploads');

// Disk Storage configuration with dynamic user/shop folder creation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine folder name from user header, body, or default fallback
    const rawFolderName =
      (req.headers['x-user-folder'] as string) ||
      req.body?.userFolder ||
      req.body?.fullName ||
      req.body?.shopName ||
      'general';

    const cleanFolder = rawFolderName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const fileCategory = file.mimetype.startsWith('video/') ? 'videos' : 'images';
    const targetDir = path.join(uploadBaseDir, 'users', cleanFolder, fileCategory);

    // Auto-create user-specific image and video folders if missing
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

// File filter for supported images, video, and document formats
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  // Allow all standard image, video, pdf, document, text, zip and application file types
  cb(null, true);
};


export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos/images
  },
});
