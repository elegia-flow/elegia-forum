import { Router, Request, Response, NextFunction } from "express";
import { dbConnect as db } from "../pool";
import likesSchema from "../schemas/likesSchema";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

router.post("/posts/:id/like", authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const postId = req.params.id;

        const existingLike = await db.query(
            `SELECT * FROM post_likes WHERE user_id = $1 AND post_id = $2`,
            [userId, postId]
        );

        if (existingLike.rows.length > 0) {
            await db.query(
                `DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2`,
                [userId, postId]
            );
            return res.json({ message: "Like removed", liked: false });
        } else {
            await db.query(
                `INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)`,
                [userId, postId]
            );
            return res.json({ message: "Like added", liked: true });
        }
    } catch (error) {
        next(error);
    }
});

export default router;
