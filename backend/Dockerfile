# Multi-stage Dockerfile optimized for GCP Cloud Run
# Stage 1: Build stage - Install dependencies
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling (useful for Cloud Run)
RUN apk add --no-cache dumb-init

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies using npm ci for faster, reliable, reproducible builds
# Use --only=production to skip devDependencies in production
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production stage - Minimal runtime image
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files and installed dependencies from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./

# Copy application source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run uses PORT env var, default to 8080)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

