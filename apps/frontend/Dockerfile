# ============================================================
#  Stage 1 — Install dependencies & build the Next.js app
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (layer cache)
COPY package.json package-lock.json ./

# Install all dependencies (including dev deps needed for build)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Set production API URL at build time
# Override with --build-arg NEXT_PUBLIC_API_URL=https://your-backend.com
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application
RUN npm run build

# ============================================================
#  Stage 2 — Lightweight production server
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S crms && adduser -S crms -G crms

# Copy only the necessary build output (standalone mode optional)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
# Fallback: if standalone is not configured, copy full .next
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN chown -R crms:crms /app
USER crms

# Expose Next.js default port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1

CMD ["npm", "start"]
