import multer from "multer";
import path from "path";
import fs from "fs";

const messagesDir = path.join(process.cwd(), "uploads", "messages");
if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, messagesDir);
  },

  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

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

export default upload;



