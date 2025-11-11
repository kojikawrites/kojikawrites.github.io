FROM node:20-alpine

# Install git and git-lfs for version control operations
RUN apk add --no-cache git git-lfs openssh-client

# Set working directory
WORKDIR /app

# Configure git
RUN git config --global --add safe.directory /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Expose Astro dev server port
EXPOSE 4321

# Set environment to development
ENV NODE_ENV=development

# Start Astro dev server
CMD ["npm", "run", "start"]
