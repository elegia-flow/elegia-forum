import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

interface JwtPayload {
    userId: number;
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Token not provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET!
        ) as JwtPayload;

        req.userId = payload.userId;

        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

export default authMiddleware;
