FROM node:24-alpine AS builder

RUN npm install -g pnpm@10.30.1

WORKDIR /app

# Copy workspace root configs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy shared package source (imported as raw TS by backend via tsx)
COPY packages/shared ./packages/shared

# Copy backend source
COPY backend ./backend

# Generate Prisma Client (dummy DATABASE_URL — generate only reads schema, never connects)
WORKDIR /app/backend
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm exec prisma generate

# --- Production Image ---
FROM node:24-alpine

RUN npm install -g pnpm@10.30.1

WORKDIR /app

# Copy workspace configs
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/frontend/package.json ./frontend/

# Install production deps + tsx (runtime TS loader)
RUN pnpm install --frozen-lockfile --prod && \
    pnpm --filter backend add tsx

# Copy shared package source (needed at runtime — tsx resolves raw TS)
COPY --from=builder /app/packages/shared/src ./packages/shared/src

# Copy backend source + Prisma artifacts
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/prisma.config.ts ./backend/prisma.config.ts

WORKDIR /app/backend

EXPOSE 5000

# Migrate (+ optional seed) then start with tsx (handles TS + ESM resolution natively)
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && if [ \"$SEED_ON_STARTUP\" = \"true\" ]; then pnpm exec prisma db seed; fi && pnpm exec tsx src/server.ts"]
