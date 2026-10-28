import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadBaseDir = path.resolve(__dirname, '../../uploads');

// Ensure base upload directory exists
if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

// Disk Storage configuration with strict sandboxed folder creation (BUG-038)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // BUG-038: Bind destination strictly to verified authenticated user ID
    // Reject untrusted headers/client bodies to prevent directory traversal
    const authUserId = (req as any).user?.userId || (req as any).user?.id;
    const cleanFolder = authUserId
      ? String(authUserId).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_')
      : 'general';

    const fileCategory = file.mimetype.startsWith('video/')
      ? 'videos'
      : file.mimetype.startsWith('image/')
      ? 'images'
      : file.mimetype.startsWith('audio/')
      ? 'audios'
      : 'documents';

    const targetDir = path.resolve(uploadBaseDir, 'users', cleanFolder, fileCategory);

    // Defense-in-depth: Ensure target directory cannot escape uploadBaseDir
    if (!targetDir.startsWith(uploadBaseDir)) {
      return cb(new Error('INVALID_PATH: Directory path traversal attempt rejected'), '');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

// BUG-039: Whitelist of strictly permitted file extensions for media & documents
const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  // Videos
  '.mp4', '.mov', '.webm', '.m4v',
  // Audio
  '.mp3', '.m4a', '.ogg', '.wav', '.aac',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
]);

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'audio/',
  'application/pdf',
  'text/csv',
  'text/plain',
  'application/msword',
  'application/vnd.',
];

// File filter enforcing strict whitelist
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new Error(
        `FORBIDDEN_FILE_TYPE: File extension '${ext}' is not permitted. Only verified media and documents are allowed.`
      )
    );
  }

  const isMimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
  if (!isMimeAllowed) {
    return cb(
      new Error(
        `FORBIDDEN_FILE_TYPE: MIME type '${file.mimetype}' is not permitted. Only verified media and documents are allowed.`
      )
    );
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});
