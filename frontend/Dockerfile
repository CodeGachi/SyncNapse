# ==========================================
# Bun Alpine Frontend Dockerfile
# ==========================================

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN rm -rf ~/.bun/install/cache && bun install --ignore-scripts

FROM oven/bun:1-alpine AS build
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "start"]
