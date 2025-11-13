FROM node:20-alpine

# Install git and git-lfs for version control operations
RUN apk add --no-cache git git-lfs openssh-client

# Set working directory
WORKDIR /app

# Configure git
RUN git config --global --add safe.directory /app

# Copy package files
COPY package*.json ./

# Install dependencies (these will be in the image as a fallback)
RUN npm ci

# Copy and set up entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose Astro dev server port
EXPOSE 4321

# Set environment to development
ENV NODE_ENV=development

# Use entrypoint to check/update node_modules on startup
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Start Astro dev server
CMD ["npm", "run", "start"]
