FROM ollama/ollama:latest

# Copy scripts from the scripts/container directory
# Context is docker/, so we use scripts/container/
COPY scripts/container/ollama-init.sh /usr/local/bin/ollama-init.sh
COPY scripts/container/ollama-entrypoint.sh /usr/local/bin/ollama-entrypoint.sh
RUN chmod +x /usr/local/bin/ollama-init.sh /usr/local/bin/ollama-entrypoint.sh

# Set working directory
WORKDIR /root

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/ollama-entrypoint.sh"]
