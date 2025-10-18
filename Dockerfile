FROM ollama/ollama:latest

# Expose the API port
EXPOSE 11434

# Start Ollama server and load DeepSeek model at runtime
CMD ["ollama", "serve", "--model", "deepseek-coder"]

