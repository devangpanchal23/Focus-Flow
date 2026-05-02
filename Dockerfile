# Base Image for Node.js
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy server code
COPY server/ ./server/

# (Optional) If you want to serve static frontend from the backend in production, 
# you could copy the dist folder here, but typically that is better served by NGINX directly.
# COPY dist/ ./dist/

# Set Environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Expose port
EXPOSE 5001

# Start the server
CMD ["node", "server/index.js"]
