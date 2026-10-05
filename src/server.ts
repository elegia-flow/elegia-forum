import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import postRouter from "./routes/postsRouter";
import commentRouter from "./routes/commentRouter";
import authRouter from "./routes/authRouter";
import likesRouter from "./routes/likesRouter";
import commentLikesRouter from "./routes/commentLikesRouter";
import profileRouter from "./routes/profileRouter";
import cors from "cors";

const app = express();

const allowedOrigins = [
    "https://netlify.app",
    "http://localhost:5500",
    "http://localhost:5173"
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true
    })
);

app.use(express.json());

app.use(authRouter);
app.use(postRouter);
app.use(commentRouter);
app.use(likesRouter);
app.use(commentLikesRouter);
app.use(profileRouter);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const PORT = Number(process.env.PORT) || 3030;
app.listen(PORT, () => console.log(`Start server on ${PORT}`));
