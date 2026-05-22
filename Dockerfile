# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install OpenSSL and libc compat libraries for Prisma engine to run on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency catalogs
COPY package.json package-lock.json ./

# Install all dependencies for compiling typescript and bundling assets
RUN npm ci

# Copy the rest of the source code and configuration files
COPY . .

# Generate Prisma Client for the build step
RUN npx prisma generate

# Build the frontend assets and bundle the backend server code
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-alpine AS runner

# Install OpenSSL and libc compat libraries for Prisma engine to run on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Set node environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Copy package catalogs
COPY package.json package-lock.json ./

# Install only production dependencies to minimize image size
RUN npm ci --omit=dev

# Copy prisma directory with the schema
COPY --from=builder /app/prisma /app/prisma

# Generate production Prisma Client (so it matches the clean production node_modules)
RUN npx prisma generate

# Copy compiled production assets (frontend dist and server cjs)
COPY --from=builder /app/dist /app/dist

# Copy entrypoint script and set execution permissions
COPY --from=builder /app/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose server port
EXPOSE 3000

# Set entrypoint to run migrations and startup sequence
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start command
CMD ["node", "dist/server.cjs"]
