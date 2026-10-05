import multer from "multer";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://supabase.co";
const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key-for-build";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        "Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set in process.env!"
    );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ALLOWED_MIME = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
]);

const storage = multer.memoryStorage();

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

export async function uploadToSupabase(
    file: Express.Multer.File
): Promise<string> {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";

    let prefix = "file-";
    if (file.fieldname === "avatar") prefix = "avatar-";
    else if (file.fieldname === "image") prefix = "post-";
    else if (file.fieldname === "comment_image") prefix = "comment-";

    const fileName = prefix + uniqueSuffix + ext;

    const { data, error } = await supabase.storage
        .from("UPLOADS")
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (error) {
        throw new Error("Supabase Storage upload error: " + error.message);
    }

    const { data: publicUrlData } = supabase.storage
        .from("UPLOADS")
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}

export async function deleteUploadFile(imageUrl: string | null | undefined) {
    if (!imageUrl) return;

    const fileName = imageUrl.split("/").pop();
    if (!fileName) return;

    const { error } = await supabase.storage.from("UPLOADS").remove([fileName]);

    if (error) {
        console.error(
            "Failed to delete the file from Supabase Storage:",
            fileName,
            error.message
        );
    }
}
