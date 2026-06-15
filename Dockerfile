FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/ || true
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 aether
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER aether
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
