import { Router, Request, Response, NextFunction } from "express";
import { dbConnect as db } from "../pool";
import authMiddleware from "../middlewares/authMiddleware";
import { uploadAvatar, deleteUploadFile } from "../middlewares/upload";

const router = Router();

router.get("/profile", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;

        const result = await db.query(
            `
            SELECT 
                u.username, 
                u.email, 
                u.avatar_url, 
                TO_CHAR(u.created_at, 'DD.MM.YYYY') AS created_at,
                (
                    SELECT COUNT(*)::int 
                    FROM post_likes pl
                    JOIN posts p ON p.id = pl.post_id
                    WHERE p.author_name = u.id::text
                ) AS total_post_likes,
                (
                    SELECT COUNT(*)::int 
                    FROM comment_likes cl
                    JOIN comments c ON c.id = cl.comment_id
                    WHERE c.author_name = u.id::text
                ) AS total_comment_likes
            FROM users u
            WHERE u.id = $1
            `,
            [userId]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json(user);
    } catch (err) {
        next(err);
    }
});

router.post("/avatar", authMiddleware, uploadAvatar, async (req, res, next) => {
    try {
        const userId = req.userId;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "File not found" });
        }

        const old = await db.query(
            `SELECT avatar_url FROM users WHERE id = $1`,
            [userId]
        );
        const oldPath = old.rows[0]?.avatar_url as string | null;

        const filePath = `/uploads/${file.filename}`;

        const result = await db.query(
            `
            UPDATE users
            SET avatar_url = $2
            WHERE id = $1
            RETURNING username, email, avatar_url, TO_CHAR(created_at, 'DD.MM.YYYY') as created_at
            `,
            [userId, filePath]
        );

        if (oldPath && oldPath !== filePath) {
            deleteUploadFile(oldPath);
        }

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete("/avatar", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;

        const old = await db.query(
            `SELECT avatar_url FROM users WHERE id = $1`,
            [userId]
        );
        const oldPath = old.rows[0]?.avatar_url as string | null;

        const result = await db.query(
            `
            UPDATE users
            SET avatar_url = NULL
            WHERE id = $1
            RETURNING username, email, avatar_url, TO_CHAR(created_at, 'DD.MM.YYYY') as created_at
            `,
            [userId]
        );

        deleteUploadFile(oldPath);

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch("/username", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { username } = req.body;

        if (!username) {
            return res
                .status(400)
                .json({ error: "New nickname not specified" });
        }

        const existingUser = await db.query(
            `SELECT id FROM users WHERE username = $1 AND id != $2`,
            [username, userId]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: "Username is taken" });
        }

        const result = await db.query(
            `
            UPDATE users
            SET username = $2
            WHERE id = $1
            RETURNING username, email, avatar_url, TO_CHAR(created_at, 'DD.MM.YYYY') as created_at
            `,
            [userId, username]
        );

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

router.get("/liked-posts", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;

        const result = await db.query(
            `
            SELECT 
                p.*,
                COALESCE(COUNT(DISTINCT pl2.id), 0)::int AS likes_count
            FROM post_likes pl
            JOIN posts p ON p.id = pl.post_id
            LEFT JOIN post_likes pl2 ON pl2.post_id = p.id
            WHERE pl.user_id = $1
            GROUP BY p.id
            ORDER BY p.created_at DESC
            `,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.get("/received-likes", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;

        const result = await db.query(
            `
            SELECT 
                pl.created_at as liked_at,
                u.username as liker_username,
                p.id as post_id,
                p.title as post_title
            FROM post_likes pl
            JOIN posts p ON p.id = pl.post_id
            JOIN users u ON u.id = pl.user_id
            WHERE p.author_name = $1
            ORDER BY pl.created_at DESC
            LIMIT 50
            `,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
});

router.get("/users/:username", async (req, res, next) => {
    try {
        const { username } = req.params;

        const result = await db.query(
            `
            SELECT 
                id,
                username, 
                avatar_url, 
                TO_CHAR(created_at, 'DD.MM.YYYY') as created_at,
                (SELECT COUNT(*) FROM post_likes 
                 WHERE post_id IN (SELECT id FROM posts WHERE author_name = u.id::text)) AS total_post_likes,
                (SELECT COUNT(*) FROM comment_likes 
                 WHERE comment_id IN (SELECT id FROM comments WHERE author_name = u.id::text)) AS total_comment_likes
            FROM users u
            WHERE username = $1
            `,
            [username]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json(user);
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
