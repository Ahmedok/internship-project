FROM node:24-alpine AS builder

RUN npm install -g pnpm@10.30.1
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

# Copy frontend source and build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN pnpm run build

# --- Production Image (nginx serves static + proxies API) ---
FROM nginx:alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
