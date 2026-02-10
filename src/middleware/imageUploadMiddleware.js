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
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const extName = path.extname(file.originalname).toLowerCase();
  const isImage = imageTypes.test(extName) && imageTypes.test(file.mimetype);

  if (isImage) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Create middleware wrapper that mimics multer API
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
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const fileExtension = path.extname(file.originalname);
        const fileName = `messages/${uniqueSuffix}${fileExtension}`;

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
        req.file.filename = `${uniqueSuffix}${fileExtension}`;
        req.file.path = req.file.location; // For backward compatibility

        next();
      } catch (error) {
        console.error("R2 upload error:", error);
        return res.status(500).json({ message: "Failed to upload file to R2" });
      }
    });
  };
};

// Create multer-like object with .single() method
const imageUpload = {
  single: (fieldName) => {
    const multerMiddleware = upload.single(fieldName);
    return createR2UploadMiddleware(multerMiddleware);
  },
};

export default imageUpload;



