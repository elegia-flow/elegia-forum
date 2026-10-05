import { Router, Request, Response, NextFunction } from "express";
import { dbConnect as db } from "../pool";
import registrationSchema from "../schemas/registrationSchema";
import authorizationSchema from "../schemas/authorizationSchema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/register", async (req, res) => {
    try {
        const validationResult = registrationSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: "Validation error",
                details: validationResult.error.format()
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const { username, email, password } = validationResult.data;

        const result = await db.query(
            `
            INSERT INTO users (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [username, email, hashedPassword]
        );

        const user = result.rows[0];

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "1h"
        });

        const { password: _, ...safeUser } = user;

        return res.status(201).json({
            token,
            user: safeUser
        });
    } catch (err) {
        if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            err.code === "23505"
        ) {
            return res.status(409).json({ message: "User already exists" });
        } else {
            return res.status(500).json({ message: "Internal server error" });
        }
    }
});

router.post("/login", async (req, res) => {
    try {
        const validationResult = authorizationSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: "Validation error",
                details: validationResult.error.format()
            });
        }

        const { email, password } = validationResult.data;

        const result = await db.query(
            `
            SELECT * FROM users WHERE email = $1
            `,
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "1h"
        });

        const { password: _, ...safeUser } = user;

        return res.json({
            token,
            user: safeUser
        });

        return res.json({ token });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
});

export default router;
