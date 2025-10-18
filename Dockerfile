FROM ollama/ollama:latest

# Start Ollama in the background, give it time to boot, then pull the DeepSeek model
RUN ollama serve & \
    sleep 10 && \
    ollama pull deepseek-coder || true

# Expose Ollama API port
EXPOSE 11434

# Start the Ollama server
CMD ["ollama", "serve"]
