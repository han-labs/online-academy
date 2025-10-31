import multer from "multer";
import path from "path";
import fs from "fs";

// Đảm bảo thư mục uploads video tồn tại
const uploadDir = "public/uploads/lectures";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình multer cho VIDEO
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "video-" + uniqueSuffix + ext);
  },
});

// Filter file type - CHẤP NHẬN VIDEO
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file video! (mp4, mov, avi, etc.)"), false);
  }
};

const uploadVideo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB - lớn hơn cho video
  },
});

export default uploadVideo;