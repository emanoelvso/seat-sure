FROM scratch AS context-check
COPY . /context

FROM node:22-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @seat-sure/shared build && pnpm --filter api build
RUN pnpm --filter api deploy --prod --legacy /runtime && \
    cp -R packages/shared/dist /runtime/node_modules/@seat-sure/shared/dist

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app && chown 1001:1001 /app
COPY --from=builder --chown=1001:1001 /runtime/node_modules ./node_modules
COPY --from=builder --chown=1001:1001 /workspace/apps/api/dist ./dist
COPY --from=builder --chown=1001:1001 /workspace/apps/api/package.json ./package.json
COPY --from=builder --chown=1001:1001 /workspace/apps/api/demo/database.mjs /workspace/apps/api/demo/migrate.mjs /workspace/apps/api/demo/seed.mjs /workspace/apps/api/demo/reset.mjs /workspace/apps/api/demo/start.mjs ./demo/
USER 1001:1001
EXPOSE 3001
CMD ["node", "dist/main.js"]
