# Voice Agent System

This repository contains two main components:

1. **Backend API** (FastAPI)
2. **Agent Pipeline** (LiveKit Agents)

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in all required values:

```dotenv
# Server
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

# Supabase (for workflow storage)
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_KEY
```

Refer to `.env.example` for placeholders and descriptions.

---

## 1. Backend API (FastAPI)

### Overview

The FastAPI server handles HTTP requests to:

* Generate LiveKit connection tokens with embedded agent dispatch
* Provide health-check and echo endpoints

### Installation

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running

```bash
# Development mode with auto-reload
python main.py
```

### API Endpoints

* **GET /**

  * Returns a welcome message
* **GET /health**

  * Returns service health status
* **POST /echo**

  * Request: `{ "content": "..." }`
  * Response: `{ "echo": "..." }`
* **POST /connect**

  * Request: `{ "project_id": "<uuid>", "user_data": { ... } }`
  * Response:

    ```json
    {
      "serverUrl": "wss://...",
      "roomName": "voice_assistant_room_<id>",
      "participantToken": "<jwt>",
      "participantName": "voice_assistant_user_<id>"
    }
    ```
  * **Behavior**: the returned JWT token includes a `RoomConfiguration` that auto-dispatches your agent worker when the client connects.

---

## 2. Agent Pipeline (LiveKit Agents)

### Overview

The pipeline runner spins up a LiveKit voice agent (`DynamicAgent`) that:

* Joins rooms via dispatch metadata
* Executes a dynamic workflow stored in Supabase

### Installation

```bash
cd pipeline
pip install -r requirements.txt
```

### Commands

```bash
python -m pipeline.runner [OPTIONS] COMMAND [ARGS]...
```

**Available Commands:**

* `start`
  Start the worker in production mode (listening for agent dispatch)

  ```bash
  python -m pipeline.runner start --agent-name conduit-agent
  ```

* `dev`
  Start the worker in development mode (hot-reload, verbose logs)

  ```bash
  python -m pipeline.runner dev
  ```

* `connect`
  Manually connect the worker to a room (for debugging)

  ```bash
  python -m pipeline.runner connect --room voice_assistant_room_<id>
  ```

* `console`
  Launch an interactive chat REPL

  ```bash
  python -m pipeline.runner console
  ```

* `download-files`
  Download plugin dependencies or assets

  ```bash
  python -m pipeline.runner download-files
  ```

---

## Workflow Example

1. **Start the FastAPI backend**:

   ```bash
   uvicorn main:app --reload
   ```
2. **Run the agent worker**:

   ```bash
   python -m pipeline.runner dev
   ```
3. **Client** fetches `/connect`, receives `serverUrl` + `participantToken`.
4. **Client** calls `room.connect(serverUrl, token)`. LiveKit auto-dispatches the worker.
5. **Agent** joins the room, runs `DynamicAgent` logic, and logs transcripts.

---

For full API and agent documentation, see:

* [https://docs.livekit.io/](https://docs.livekit.io/)
* [https://docs.livekit.io/agents/](https://docs.livekit.io/agents/)
