# Use Ollama base image
FROM ollama/ollama:latest

# Preload your model (optional but recommended)
RUN ollama pull deepseek-coder

# Expose the API port
EXPOSE 11434

# Start Ollama server
CMD ["ollama", "serve"]
