# AI Chatbot Setup Guide

## Overview

The chatbot can use OpenAI's GPT models (ChatGPT) for intelligent responses, or fall back to a rule-based system if OpenAI is not configured.

## Setup Options

### Option 1: Using OpenAI (Recommended)

1. **Get OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Go to API Keys section
   - Create a new API key

2. **Create Environment File**
   ```bash
   cd backend
   cp .env.example .env
   ```

3. **Add API Key**
   Edit `backend/.env` file:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

### Option 2: Using Rule-Based System (No API Key Required)

If you don't have an OpenAI API key, the chatbot will automatically use a rule-based system that provides intelligent responses based on:
- Risk score interpretation
- Laboratory value analysis
- SHAP feature importance
- Treatment recommendations

No configuration needed!

## Alternative LLM Models

You can use other LLM providers by modifying `backend/app.py`:

### Using Anthropic Claude
```python
from anthropic import Anthropic
client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
```

### Using Google Gemini
```python
import google.generativeai as genai
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
```

### Using Local LLM (LM Studio, Ollama)
```python
# Configure local LLM endpoint
local_client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="not-needed"
)
```

## Testing

1. Start the backend server:
   ```bash
   python app.py
   ```

2. Start the frontend:
   ```bash
   cd um-cvd-web
   npm run dev
   ```

3. Navigate to results page and click the chatbot button

## Troubleshooting

- **"Module not found"**: Run `pip install openai python-dotenv`
- **"API error"**: Check your API key in `.env` file
- **Chatbot not responding**: Check backend console for error messages

## Costs

OpenAI pricing (as of 2024):
- GPT-3.5-turbo: ~$0.0015 per 1000 tokens (extremely cheap)
- GPT-4: ~$0.03 per 1000 tokens (more expensive but smarter)

For 100 requests, expect ~$0.01-0.30 depending on model.

## Security

- Never commit `.env` file with real API keys
- Use environment variables in production
- Consider rate limiting for production use
