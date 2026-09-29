# ---------------------------------------------------
# Production Multi-Stage Dockerfile for Monorepo
# ---------------------------------------------------

FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS dependencies
COPY package*.json turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/ui/package*.json ./packages/ui/
RUN npm ci

# Stage 2: Build applications
FROM dependencies AS builder
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app ./

EXPOSE 3000 5000

CMD ["npm", "run", "dev"]
