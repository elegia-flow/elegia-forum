import { Router, Request, Response, NextFunction } from "express";
import { dbConnect as db } from "../pool";
import commentLikesSchema from "../schemas/commentLikesSchema";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();

router.post(
    "/posts/comments/:id/like",
    authMiddleware,
    async (req, res, next) => {
        try {
            const userId = req.userId;
            const comment_id = req.params.id;

            const existingLikeComment = await db.query(
                `SELECT * FROM comment_likes WHERE user_id = $1 AND comment_id = $2`,
                [userId, comment_id]
            );

            if (existingLikeComment.rows.length > 0) {
                await db.query(
                    `DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2`,
                    [userId, comment_id]
                );
                return res.json({
                    message: "Comment deleted",
                    liked: false
                });
            } else {
                await db.query(
                    `INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)`,
                    [userId, comment_id]
                );
                return res.json({
                    message: "Comment added",
                    liked: true
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

export default router;
