FROM ollama/ollama:latest

# Expose the API port
EXPOSE 11434

# Start Ollama server and pull model automatically
CMD ollama serve --model deepseek-coder

