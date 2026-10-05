import {
    uploadPostImage,
    deleteUploadFile,
    uploadToSupabase
} from "../middlewares/upload";
import { Router, Request, Response, NextFunction } from "express";
import { dbConnect as db } from "../pool";
import authMiddleware from "../middlewares/authMiddleware";
import jwt from "jsonwebtoken";

const router = Router();

router.get("/posts", async (req, res, next) => {
    try {
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
                p.*,
                u.username AS author_username,
                u.avatar_url AS author_avatar,
                COALESCE(COUNT(DISTINCT pl.id), 0)::int AS likes_count,
                CASE 
                    WHEN $1::int IS NOT NULL AND EXISTS (
                        SELECT 1 FROM post_likes 
                        WHERE post_id = p.id AND user_id = $1
                    ) THEN true 
                    ELSE false 
                END AS is_liked
            FROM posts p
            LEFT JOIN users u ON u.id = p.author_name::integer
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            GROUP BY p.id, u.username, u.avatar_url
            ORDER BY p.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.post(
    "/posts",
    authMiddleware,
    uploadPostImage,
    async (req, res, next) => {
        try {
            const title = String(req.body.title || "").trim();
            const body = String(req.body.body || "").trim();

            if (!title) {
                return res.status(400).json({ error: "Title cannot be empty" });
            }
            if (!body) {
                return res
                    .status(400)
                    .json({ error: "Description cannot be empty" });
            }

            let image_url: string | null = null;
            if (req.file) {
                image_url = await uploadToSupabase(req.file);
            } else if (req.body.image_url) {
                image_url = String(req.body.image_url).trim() || null;
            }

            const result = await db.query(
                `INSERT INTO posts (author_name, title, image_url, body)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [req.userId, title, image_url, body]
            );

            return res.status(201).json(result.rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/posts/:id",
    authMiddleware,
    uploadPostImage,
    async (req, res, next) => {
        try {
            const postId = req.params.id;
            const title =
                req.body.title !== undefined
                    ? String(req.body.title).trim()
                    : null;
            const body =
                req.body.body !== undefined
                    ? String(req.body.body).trim()
                    : null;

            let image_url: string | null = null;
            let updateImage = false;

            if (req.file) {
                image_url = await uploadToSupabase(req.file);
                updateImage = true;
            } else if (req.body.image_url !== undefined) {
                image_url = String(req.body.image_url).trim() || null;
                updateImage = true;
            }

            let oldImage: string | null = null;
            if (updateImage) {
                const old = await db.query(
                    `SELECT image_url FROM posts WHERE id = $1 AND author_name::text = $2`,
                    [postId, String(req.userId)]
                );
                oldImage = old.rows[0]?.image_url || null;
            }

            let result;
            if (updateImage) {
                result = await db.query(
                    `
                    UPDATE posts
                    SET
                        title = COALESCE($1, title),
                        image_url = $2,
                        body = COALESCE($3, body)
                    WHERE id = $4 AND author_name::text = $5
                    RETURNING *`,
                    [title, image_url, body, postId, String(req.userId)]
                );
            } else {
                result = await db.query(
                    `
                    UPDATE posts
                    SET
                        title = COALESCE($1, title),
                        body = COALESCE($2, body)
                    WHERE id = $3 AND author_name::text = $4
                    RETURNING *`,
                    [title, body, postId, String(req.userId)]
                );
            }

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: "Post not found or you don't have permission to delete it"
                });
            }

            if (updateImage && oldImage && oldImage !== image_url) {
                await deleteUploadFile(oldImage);
            }

            return res.status(200).json(result.rows[0]);
        } catch (err) {
            next(err);
        }
    }
);

router.delete("/posts/:id", authMiddleware, async (req, res, next) => {
    try {
        const postId = req.params.id;

        const existing = await db.query(
            `SELECT image_url FROM posts WHERE id = $1 AND author_name::text = $2`,
            [postId, String(req.userId)]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "Post not found or you don't have permission to delete it"
            });
        }

        const oldImage = existing.rows[0].image_url as string | null;

        const commentImgs = await db.query(
            `SELECT image_url FROM comments WHERE post_id = $1 AND image_url IS NOT NULL`,
            [postId]
        );

        const result = await db.query(
            `
            DELETE FROM posts
            WHERE id = $1 AND author_name::text = $2
            RETURNING id`,
            [postId, String(req.userId)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Post not found or you don't have permission to delete it"
            });
        }

        await deleteUploadFile(oldImage);
        for (const row of commentImgs.rows) {
            await deleteUploadFile(row.image_url);
        }

        return res.status(200).json(result.rows[0]);
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
