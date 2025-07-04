# Frontend - React Flow Demo + VoiceAgent Integration

This is a React application built with Tailwind CSS, React Flow, and LiveKit VoiceAgent.

## Tech Stack

* React
* Tailwind CSS
* React Flow
* LiveKit Components & Voice Assistant (via `@livekit/components-react`)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

## Environment

Copy `.env.example` to `.env` (or set your own) and configure:

```env
# API endpoint for obtaining LiveKit connection details
VITE_AGENT_ENDPOINT=http://localhost:8000/connect

# Supabase (for storing/fetching workflows or user data)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Livekit
VITE_LIVEKIT_URL=your_livekit_url_here
VITE_LIVEKIT_TOKEN=your_livekit_token_here
```

## Project Structure

* `src/components/FlowDiagram.tsx`
  React Flow component example
* `src/components/VoiceAgent.jsx`
  VoiceAgent UI using LiveKit React Components
* `src/App.tsx`
  Main application component mounting both Flow and VoiceAgent
* `tailwind.config.js`
  Tailwind CSS configuration
* `postcss.config.js`
  PostCSS configuration

## Features

* Interactive flow diagram with React Flow
* Voice-powered assistant via LiveKit Components:

  * Real-time streaming audio
  * Bar visualizer of agent speech
  * Control bar for mute/leave
* Responsive design with Tailwind CSS

---
