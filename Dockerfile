FROM ollama/ollama:latest

# Expose the API port
EXPOSE 11434

# Just use the base entrypoint and pass arguments
CMD ["serve", "--model", "deepseek-coder"]
