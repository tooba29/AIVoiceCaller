# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies needed for your app
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    git \
    bash

# Copy package files first for better caching
COPY package*.json ./

# Clear npm cache and install ALL dependencies (including dev dependencies for build)
RUN npm cache clean --force && npm ci

# Verify npm and node versions
RUN node --version && npm --version

# Verify build tools are available
RUN which tsc || echo "TypeScript not found"
RUN which vite || echo "Vite not found"

# Copy source code
COPY . .

# Debug: List what's in the directory
RUN ls -la

# Debug: Check available scripts
RUN npm run

# Build the application with verbose output
RUN npm run build --verbose || (echo "Build failed, checking logs..." && cat /root/.npm/_logs/*.log && exit 1)

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose port (Railway will set this automatically)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"] 