# Dynamic Voice Agent Workflow System

A full-stack application that enables creation and execution of dynamic voice agent workflows, powered by LiveKit and React Flow.

## Project Overview

This project consists of two main components:

1. **Frontend**: A React-based web application for creating and managing voice agent workflows
2. **Backend**: A FastAPI server with LiveKit integration for handling voice agent interactions

## Tech Stack

### Frontend
- React
- Tailwind CSS for styling
- React Flow for workflow building and visualization
- LiveKit Components for voice agent integration
- Supabase for data persistence
- Vite for build tooling

### Backend
- FastAPI for API endpoints
- LiveKit Agents for voice processing
- Deepgram for Speech-to-Text and Text-to-Speech
- OpenAI for LLM processing
- Supabase for workflow storage

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Python 3.10+ (for backend)
- LiveKit server access
- Supabase account
- API keys for: Deepgram, OpenAI, Cartesia

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Configure environment variables
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env  # Configure environment variables
   python main.py
   ```

## Environment Configuration

### Frontend (.env)
```env
VITE_AGENT_ENDPOINT=http://localhost:8000/connect
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_LIVEKIT_URL=your_livekit_url_here
VITE_LIVEKIT_TOKEN=your_livekit_token_here
```

### Backend (.env)
```env
DEBUG=True
API_HOST=0.0.0.0
API_PORT=8000

# AI Services
DEEPGRAM_API_KEY=YOUR_DEEPGRAM_API_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
CARTESIA_API_KEY=YOUR_CARTESIA_API_KEY

# LiveKit
LIVEKIT_URL=wss://your.livekit.server
LIVEKIT_API_KEY=YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=YOUR_LIVEKIT_API_SECRET

# Supabase
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_KEY
```

## Project Structure

```
.
├── frontend/                # React frontend application
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── db/            # Database setup and queries
│   │   └── ...
│   ├── public/            # Static assets
│   └── package.json       # Dependencies and scripts
│
└── backend/               # FastAPI backend application
    ├── _agent/           # Voice agent implementation
    ├── pipeline/         # Agent pipeline components
    ├── main.py          # FastAPI application entry
    └── requirements.txt  # Python dependencies
```

## Features

- Interactive workflow creation with React Flow
- Real-time voice agent interaction
- Dynamic workflow execution
- Database persistence with Supabase
- Voice processing with LiveKit integration

## Development

### Frontend
- Development server: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

### Backend
- Development server: `python main.py`
- Development agent: `python -m pipeline.runner dev`
- Production agent: `python -m pipeline.runner start --agent-name conduit-agent`