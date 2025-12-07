# syntax=docker/dockerfile:1

# ==========================================
# Bun Alpine Backend Dockerfile
# ==========================================

FROM oven/bun:1-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json bun.lockb* ./
RUN rm -rf ~/.bun/install/cache && bun install --ignore-scripts

FROM oven/bun:1-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate && bun run build

FROM oven/bun:1-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
CMD ["bun", "run", "dist/main.js"]
