# Stage 1: Build the React application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code and build it
COPY . .
# Only VITE_API_URL is passed as a build arg (see docker-compose.yml). Firebase config is read
# from the copied .env file. Don't declare empty ENV defaults for VITE_* here: existing process
# env vars take priority over .env in Vite, so an empty ENV would blank out the real value.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Copy built files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
