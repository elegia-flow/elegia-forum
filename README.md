# Elegia

A learning project: a small **Reddit-like forum** with a post feed, nested comments, likes, profiles, and image uploads.

## About

Full-stack pet project inspired by Reddit: auth, posts and comments (with images), likes, profiles (avatar & username), and a responsive UI.

**Backend** (API, database access, auth, validation, file uploads) was written by me from scratch as part of learning backend development.

**Frontend** (layout, UI, client-side logic) was built with AI assistance and adapted to match this API and a single visual style.

## Tech stack

**Backend**

- Node.js, Express, TypeScript (tsx)
- PostgreSQL (`pg`)
- JWT + bcrypt
- Zod (validation)
- Multer (image uploads)
- CORS, dotenv

**Frontend**

- HTML, CSS, vanilla JavaScript
- Responsive (desktop / mobile)

**Hosting (example setup)**

- Frontend: Netlify
- API: Render
- Database: Supabase (PostgreSQL)

## Features

- Register / login (JWT)
- Posts: create, edit, delete, image from device
- Comments & replies, images in comments
- Likes on posts and comments
- Profile: avatar, username, like stats
- Search by post title
- Responsive UI

## Run locally

### Requirements

- Node.js
- PostgreSQL

### Backend

1. Clone the repo
2. `npm install`
3. Copy `.env.example` → `.env` and fill in values
4. Create tables in PostgreSQL (your schema)
5. `npx tsx src/server.ts`

### Frontend

Open `index.html` with Live Server (or any static server).  
Default API: `http://localhost:3030`.

## Environment variables

See `.env.example`:

- `PORT`
- `DB_*` or `DATABASE_URL`
- `DB_SSL` (for Supabase / cloud)
- `JWT_SECRET`
- `FRONTEND_URL`

## Layout

- `src/` — server, routes, middleware, schemas
- `index.html`, `style.css`, `script.js` — frontend
- `uploads/` — uploaded files (local only, not committed)

## Note

Educational project. Do not use real passwords or emails on a public deployment. Keep secrets in environment variables, never in source code.
