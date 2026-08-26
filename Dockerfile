FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY server ./server
RUN npx tsc || true

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:3100/api/health || exit 1
CMD ["node", "dist/server/index.js"]
