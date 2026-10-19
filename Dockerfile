FROM node:22-bookworm-slim

# Install system dependencies needed for compiling better-sqlite3 and downloading packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and client package manifests
COPY package*.json ./
COPY client/package*.json ./client/

# Install root dependencies and client dependencies
RUN npm install
RUN npm --prefix client install

# Install Playwright Chromium and required Linux system libraries
RUN npx playwright install --with-deps chromium

# Copy remaining source code
COPY . .

# Build React client for production
RUN npm run build:client

# Ensure persistent data directory exists for SQLite
RUN mkdir -p /app/data

# Expose default port
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HEADLESS_DEFAULT=true

# Start the Express server
CMD ["node", "server/index.js"]
