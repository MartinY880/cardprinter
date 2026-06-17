# Stage 1: Build React frontend
FROM node:20-alpine AS builder
WORKDIR /build

ARG VITE_LOGTO_ENDPOINT
ARG VITE_LOGTO_APP_ID
ENV VITE_LOGTO_ENDPOINT=$VITE_LOGTO_ENDPOINT
ENV VITE_LOGTO_APP_ID=$VITE_LOGTO_APP_ID

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime — Node.js serves static files + API + external proxies
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY server/creds-api.cjs ./
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/dist
ENV PORT=3000
EXPOSE 3000
CMD ["node", "creds-api.cjs"]
