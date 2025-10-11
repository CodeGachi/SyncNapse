# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.20.0
FROM node:${NODE_VERSION}-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# Install all dependencies (including dev) for build
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Install only production deps for runtime image
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
