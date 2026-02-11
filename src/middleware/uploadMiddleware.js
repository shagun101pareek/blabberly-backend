import multer from "multer";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";

// Configure S3 client for R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Use memory storage to get file buffer
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const fileTypes = /jpeg|jpg|png/;
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only images allowed"));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Create middleware wrapper that mimics multer API and uploads to R2
const createR2UploadMiddleware = (multerMiddleware) => {
  return async (req, res, next) => {
    // First, parse the multipart form data using multer
    multerMiddleware(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return next();
      }

      try {
        const file = req.file;
        const fileExtension = path.extname(file.originalname);
        const userId =
          req.user?.id || req.user?._id?.toString() || "unknown-user";
        const fileBaseName = `${userId}-${Date.now()}`;
        const fileName = `profile-pics/${fileBaseName}${fileExtension}`;

        // Upload to R2
        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await s3Client.send(command);

        // Update req.file with R2 URL
        req.file.location = `${process.env.R2_PUBLIC_BASE_URL}${fileName}`;
        req.file.filename = `${fileBaseName}${fileExtension}`;
        req.file.path = req.file.location; // For backward compatibility

        next();
      } catch (error) {
        console.error("R2 upload error (profile picture):", error);
        return res
          .status(500)
          .json({ message: "Failed to upload profile picture to R2" });
      }
    });
  };
};

// Create multer-like object with .single() method
const uploadR2 = {
  single: (fieldName) => {
    const multerMiddleware = upload.single(fieldName);
    return createR2UploadMiddleware(multerMiddleware);
  },
};

export default uploadR2;
