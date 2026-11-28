FROM node:22-bookworm AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm db:generate
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
RUN pnpm build

FROM node:22-bookworm AS api
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-vie tesseract-ocr-eng poppler-utils \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV COREPACK_HOME=/usr/local/share/corepack
RUN corepack enable && corepack install -g pnpm@10.32.1 && chmod -R a+rX /usr/local/share/corepack
COPY --from=build /app /app
RUN mkdir -p /data/uploads && chown -R node:node /data/uploads
ENV NODE_ENV=production
ENV DOCUMENT_OCR_LANGS=vie+eng
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

FROM caddy:2-alpine AS web
COPY --from=build /app/apps/app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
