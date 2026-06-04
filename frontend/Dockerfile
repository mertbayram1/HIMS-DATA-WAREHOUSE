FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Expose the Vite development port
EXPOSE 5173

# Run the React/Vite development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
