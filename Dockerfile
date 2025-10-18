FROM ollama/ollama:latest

# Pull the DeepSeek model during image build
RUN ollama serve & \
    sleep 5 && \
    ollama pull deepseek-coder

# Expose Ollama API port
EXPOSE 11434

# Start the Ollama server (no --model flag)
CMD ["ollama", "serve"]
