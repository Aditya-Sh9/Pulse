FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY --chown=node:node . .

# Don't run the server as root
USER node

# Expose backend port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
