import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/profiles');
const documentDir = path.join(__dirname, '../../uploads/documents');
const organizationDir = path.join(__dirname, '../../uploads/organizations');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(documentDir)) {
  fs.mkdirSync(documentDir, { recursive: true });
}

if (!fs.existsSync(organizationDir)) {
  fs.mkdirSync(organizationDir, { recursive: true });
}

// Configure storage for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// Configure storage for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images (for profile pictures)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// File filter - allow images and PDF (for documents)
const documentFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
  }
};

// Configure multer for profile pictures
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Configure multer for documents (larger size limit for PDFs)
const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
});

// Combined upload for employee (profile picture + ID proof)
export const employeeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Route to appropriate directory based on field name
      if (file.fieldname === 'profilePicture') {
        cb(null, uploadDir);
      } else if (file.fieldname === 'idProof') {
        cb(null, documentDir);
      } else {
        cb(new Error('Invalid field name'), '');
      }
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp-randomstring-originalname
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext);
      cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Apply appropriate filter based on field name
    if (file.fieldname === 'profilePicture') {
      fileFilter(req, file, cb);
    } else if (file.fieldname === 'idProof') {
      documentFileFilter(req, file, cb);
    } else {
      cb(new Error('Invalid field name'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (max of both)
  },
}).fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'idProof', maxCount: 1 }
]);

// Configure multer for organization logos
export const organizationLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, organizationDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const slug = (req as any).organization?.slug || 'org';
      const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(7);
      cb(null, `${slug}-logo-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Helper to delete old profile picture
export const deleteOldProfilePicture = (filePath: string | null) => {
  if (!filePath) return;

  // Check if it's a local file (not a URL)
  if (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/')) {
    const fullPath = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

// Helper to delete old document
export const deleteOldDocument = (filePath: string | null) => {
  if (!filePath) return;

  // Check if it's a local file (not a URL)
  if (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/')) {
    const fullPath = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};
