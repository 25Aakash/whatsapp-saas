# ========== Dependencies ==========
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ========== Build ==========
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time env vars
ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

RUN npm run build

# ========== Production ==========
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
