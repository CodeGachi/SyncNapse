# SyncNapse AI Module - Environment Variables

This document describes the environment variables required for the AI chatbot module.

## Required Environment Variables

Add these to your `.env` file:

```bash
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini Model Name (optional, defaults to gemini-1.5-flash)
GEMINI_MODEL_NAME=gemini-1.5-flash
```

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Navigate to "Get API Key"
4. Create a new API key or use an existing one
5. Copy the API key and add it to your `.env` file

## Usage

Once configured, the AI chatbot will be available in the note editor:
- Open any lecture note
- Click on the chatbot panel (right side)
- Ask questions, request summaries, or generate quizzes

## API Endpoint

The chatbot communicates with:
- `POST /api/ai/chat` - Send chat messages
- `GET /api/ai/health` - Check AI service status

## Troubleshooting

If the chatbot isn't working:
1. Verify `GEMINI_API_KEY` is set correctly
2. Check backend logs for errors
3. Test the health endpoint: `curl http://localhost:4000/api/ai/health`
4. Ensure your note has transcription or content data

