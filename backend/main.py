# main.py

import os
import uuid
import json
import datetime
import logging
from typing import Dict, Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, UUID4
from livekit.api import (
    AccessToken,
    VideoGrants,
    RoomConfiguration,
    RoomAgentDispatch,
)
import uvicorn

# ─── Load env & configure logging ─────────────────────────────────────────────
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("voice-agent-api")

# ─── FastAPI setup ────────────────────────────────────────────────────────────
app = FastAPI(title="Voice Agent API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # TODO: lock this down in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── LiveKit credentials ──────────────────────────────────────────────────────
LIVEKIT_URL        = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY    = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
if not (LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET):
    logger.error("Missing LIVEKIT_URL / API_KEY / API_SECRET in env")
    raise RuntimeError("LiveKit configuration missing")

# ─── Pydantic models ───────────────────────────────────────────────────────────
class WebClientRequest(BaseModel):
    project_id: UUID4
    user_data: Optional[Dict[str, Any]] = None

class Message(BaseModel):
    content: str

# ─── Health & echo endpoints ──────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Welcome to Voice Agent API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/echo")
async def echo(msg: Message):
    return {"echo": msg.content}

# ─── Main: connect & dispatch via token RoomConfiguration ──────────────────────
@app.post("/connect")
async def connect(request: WebClientRequest):
    room_name = f"voice_assistant_room_{uuid.uuid4().hex[:8]}"
    identity  = f"voice_user_{uuid.uuid4().hex[:8]}"

    # metadata your agent will read
    job_metadata = {
        "project_id": str(request.project_id),
        "room_name":  room_name,
        "user_data":  request.user_data or {},
    }

    # Build a token that includes a RoomConfiguration with RoomAgentDispatch
    token = (
        AccessToken(api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_ttl(datetime.timedelta(minutes=15))
        .with_grants(
            VideoGrants(
                room=room_name,
                room_join=True,
                can_publish=True,
                can_publish_data=True,
                can_subscribe=True,
            )
        )
        .with_room_config(
            RoomConfiguration(
                agents=[
                    RoomAgentDispatch(
                        agent_name="conduit-agent",
                        metadata=json.dumps(job_metadata),
                    )
                ]
            )
        )
        .to_jwt()
    )

    return {
        "serverUrl":        LIVEKIT_URL,
        "roomName":         room_name,
        "participantToken": token,
        "participantName":  identity,
    }


# ─── Entrypoint for dev/testing ───────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
