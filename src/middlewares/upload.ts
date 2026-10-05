import multer from "multer";
import path from "path";
import fs from "fs";

const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";

        let prefix = "file-";
        if (file.fieldname === "avatar") prefix = "avatar-";
        else if (file.fieldname === "image") prefix = "post-";
        else if (file.fieldname === "comment_image") prefix = "comment-";

        cb(null, prefix + uniqueSuffix + ext);
    }
});

const imageFilter: multer.Options["fileFilter"] = (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG, WEBP, or GIF files are allowed"));
    }
};

export const uploadAvatar = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: imageFilter
}).single("avatar");

export const uploadPostImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter
}).single("image");

export const uploadCommentImage = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: imageFilter
}).single("comment_image");

export function deleteUploadFile(imageUrl: string | null | undefined) {
    if (!imageUrl) return;
    if (!imageUrl.startsWith("/uploads/")) return;

    const filePath = path.join(process.cwd(), imageUrl.replace(/^\//, ""));
    fs.unlink(filePath, (err) => {
        if (err && (err as NodeJS.ErrnoException).code !== "ENOENT") {
            console.error("Failed to delete the file:", filePath, err.message);
        }
    });
}
