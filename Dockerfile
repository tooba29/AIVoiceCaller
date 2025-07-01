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

# Environment variables  runtime
ARG BASE_URL
ARG DATABASE_URL
ARG ELEVENLABS_AGENT_ID
ARG ELEVENLABS_API_KEY
ARG NODE_ENV
ARG OPENAI_API_KEY
ARG PORT
ARG SESSION_SECRET
ARG TWILIO_ACCOUNT_SID
ARG TWILIO_AUTH_TOKEN
ARG TWILIO_PHONE_NUMBER

# Set environment variables
ENV BASE_URL=$BASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV ELEVENLABS_AGENT_ID=$ELEVENLABS_AGENT_ID
ENV ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY
ENV NODE_ENV=$NODE_ENV
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV PORT=$PORT
ENV SESSION_SECRET=$SESSION_SECRET
ENV TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID
ENV TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
ENV TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER

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