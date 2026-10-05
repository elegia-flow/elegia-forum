import { uploadCommentImage, deleteUploadFile } from "../middlewares/upload";
import { Router, Request, Response, NextFunction } from "express";
import { dbConnect as db } from "../pool";
import authMiddleware from "../middlewares/authMiddleware";
import jwt from "jsonwebtoken";

const router = Router();

router.post(
    "/comment/:id",
    authMiddleware,
    uploadCommentImage,
    async (req, res, next) => {
        try {
            const post_id = Number(req.params.id);
            const comment_text = String(req.body.comment_text || "").trim();
            const parent_id = req.body.parent_id
                ? Number(req.body.parent_id)
                : null;

            if (!comment_text) {
                return res
                    .status(400)
                    .json({ error: "Comment cannot be empty" });
            }

            let image_url: string | null = null;
            if (req.file) {
                image_url = `/uploads/${req.file.filename}`;
            } else if (req.body.image_url) {
                image_url = String(req.body.image_url).trim() || null;
            }

            const result = await db.query(
                `
                INSERT INTO comments (post_id, parent_id, comment_text, image_url, author_name)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [post_id, parent_id, comment_text, image_url, req.userId]
            );

            return res.status(201).json(result.rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/comment/:id",
    authMiddleware,
    uploadCommentImage,
    async (req, res, next) => {
        try {
            const commentId = Number(req.params.id);
            const comment_text =
                req.body.comment_text !== undefined
                    ? String(req.body.comment_text).trim()
                    : null;

            let image_url: string | null = null;
            let updateImage = false;

            if (req.file) {
                image_url = `/uploads/${req.file.filename}`;
                updateImage = true;
            } else if (req.body.image_url !== undefined) {
                image_url = String(req.body.image_url).trim() || null;
                updateImage = true;
            }

            let oldImage: string | null = null;
            if (updateImage) {
                const old = await db.query(
                    `SELECT image_url FROM comments WHERE id = $1 AND author_name::text = $2`,
                    [commentId, String(req.userId)]
                );
                oldImage = old.rows[0]?.image_url || null;
            }

            let result;
            if (updateImage) {
                result = await db.query(
                    `
                    UPDATE comments
                    SET
                        comment_text = COALESCE($1, comment_text),
                        image_url = $2
                    WHERE id = $3 AND author_name::text = $4
                    RETURNING *`,
                    [comment_text, image_url, commentId, String(req.userId)]
                );
            } else {
                result = await db.query(
                    `
                    UPDATE comments
                    SET comment_text = COALESCE($1, comment_text)
                    WHERE id = $2 AND author_name::text = $3
                    RETURNING *`,
                    [comment_text, commentId, String(req.userId)]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Comment not found or you don't have permission to delete it"
                });
            }

            if (updateImage && oldImage && oldImage !== image_url) {
                deleteUploadFile(oldImage);
            }

            return res.status(200).json(result.rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

router.delete("/comment/:id", authMiddleware, async (req, res, next) => {
    try {
        const commentId = Number(req.params.id);

        const existing = await db.query(
            `SELECT image_url FROM comments WHERE id = $1 AND author_name::text = $2`,
            [commentId, String(req.userId)]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "Comment not found or you don't have permission to delete it"
            });
        }

        const oldImage = existing.rows[0].image_url as string | null;

        const childImgs = await db.query(
            `SELECT image_url FROM comments WHERE parent_id = $1 AND image_url IS NOT NULL`,
            [commentId]
        );

        const result = await db.query(
            `
            DELETE FROM comments
            WHERE id = $1 AND author_name::text = $2
            RETURNING id`,
            [commentId, String(req.userId)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Comment not found or you don't have permission to delete it"
            });
        }

        deleteUploadFile(oldImage);
        for (const row of childImgs.rows) {
            deleteUploadFile(row.image_url);
        }

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.get("/comments/:postId", async (req, res, next) => {
    try {
        const postId = Number(req.params.postId);

        let userId: number | null = null;
        const authHeader = req.headers.authorization;

        if (authHeader) {
            try {
                const token = authHeader.split(" ")[1];
                const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
                    userId: number;
                };
                userId = payload.userId;
            } catch {}
        }

        const result = await db.query(
            `
            SELECT 
                c.*,
                u.username AS author_username,
                u.avatar_url AS author_avatar,
                COALESCE(COUNT(DISTINCT cl.id), 0)::int AS likes_count,
                CASE 
                    WHEN $2::int IS NOT NULL AND EXISTS (
                        SELECT 1 FROM comment_likes 
                        WHERE comment_id = c.id AND user_id = $2
                    ) THEN true 
                    ELSE false 
                END AS is_liked
            FROM comments c
            LEFT JOIN users u ON u.id = c.author_name::integer
            LEFT JOIN comment_likes cl ON cl.comment_id = c.id
            WHERE c.post_id = $1
            GROUP BY c.id, u.username, u.avatar_url
            ORDER BY c.created_at ASC
            `,
            [postId, userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const customErr = err as Error & { status?: number };
    const statusCode = customErr.status || 500;
    return res.status(statusCode).json({
        error: err.message || "Internal server error"
    });
});

export default router;
