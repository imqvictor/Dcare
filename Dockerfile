FROM ollama/ollama:latest

# Expose the API port
EXPOSE 11434

# Start the Ollama server only
CMD ["serve"]

