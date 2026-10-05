import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const useSsl = process.env.DB_SSL === "true";

export const dbConnect = new Pool(
    process.env.DATABASE_URL
        ? {
              connectionString: process.env.DATABASE_URL,
              ssl: useSsl ? { rejectUnauthorized: false } : undefined
          }
        : {
              user: process.env.DB_USER,
              host: process.env.DB_HOST,
              database: process.env.DB_NAME,
              password: process.env.DB_PASSWORD,
              port: Number(process.env.DB_PORT) || 5432,
              ssl: useSsl ? { rejectUnauthorized: false } : undefined
          }
);

dbConnect
    .connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch((err: Error) =>
        console.error("Database connection error:", err.message)
    );
