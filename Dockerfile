# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies needed for your app
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway will set this automatically)
EXPOSE $PORT

# Start the application
CMD ["npm", "start"] 