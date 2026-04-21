# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S dukani -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci && \
    cd server && npm ci && \
    cd ../client && npm ci
COPY . .
EXPOSE 3000 5173
CMD ["npm", "start"]

# Build stage for client
FROM base AS build-client
ENV NODE_ENV=production
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY client/ ./
RUN npm run build

# Production stage for server
FROM base AS production-server
ENV NODE_ENV=production
WORKDIR /app/server

# Install only production dependencies
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy server source code
COPY server/ ./

# Create logs directory
RUN mkdir -p logs && chown -R dukani:nodejs logs

# Switch to non-root user
USER dukani

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000
CMD ["dumb-init", "node", "server.js"]