# ================================================================
# saikyo-todo: Next.js web (standalone) 用 Dockerfile
# ================================================================
# output: 'standalone' が next.config.ts で有効なので、build 後の
# .next/standalone を最小ランタイムにコピー。
# ================================================================

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js build (drizzle generate は CI 側で済んでいる前提)
RUN pnpm next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone 出力: Next.js 最小ランタイム
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/messages ./messages
EXPOSE 3001
ENV PORT=3001
# HOSTNAME=0.0.0.0 で container 外から到達可
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
