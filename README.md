# Internship Final Project - Inventory Management App

This is a development training project on Typescript.

Main goal was to create the abstract inventory management application with a proper inventory customization, user and access management, and two main "killer-features": Custom ID and item fields setup.

**Deployed App:** [https://project.miskaris.com](https://project.miskaris.com)

## Main tech stack and libraries

| Layer    | Technology                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React 19, Vite 7, TailwindCSS 4, shadcn/ui, React Router 7, TanStack Query v5 + Table v8, React Hook Form, Zustand, @dnd-kit, react-markdown, Sonner (toasts), Socket.IO client |
| Backend  | Express 5, Passport.js (Google + Facebook OAuth), express-session + connect-pg-simple, Socket.IO, Zod, Cloudinary SDK, multer, isomorphic-dompurify                             |
| Database | PostgreSQL 18 via Prisma ORM (with @prisma/adapter-pg), full-text search via tsvector/tsquery + GIN indexes                                                                     |
| Shared   | Zod schemas + TypeScript types + custom ID generation/validation in `packages/shared/`                                                                                          |
| Testing  | Vitest, Supertest, Testing Library (React)                                                                                                                                      |

## How to deploy locally

The project is fully containerized.

1. Clone the repository.
2. Copy and properly setup .env according to the .env.example using your own credentials.
3. Run with Docker Compose:
    ```bash
    docker compose up -d --build
    ```
4. Open on the FRONTEND_URL you have specified in .env and rejoice!
