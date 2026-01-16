# Dev-focused Dockerfile for Wisherr Frontend (uses CRA dev server)
FROM node:20-alpine
WORKDIR /app
# Install deps (legacy peer deps to be tolerant)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source and public files
COPY . .

# Expose CRA dev server port
EXPOSE 3000

# Start in development mode (uses REACT_APP_* env vars from docker-compose)
CMD ["npm", "start"]
