# pipeline/runner.py
import datetime
import json
import logging
import uuid
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli

from pipeline.db import WorkflowDB
from pipeline.models import ConversationLog, DynamicUserData, DynamicWorkflowState
from pipeline.agent import DynamicAgent, DynamicLoggingSession

# ─── Setup ────────────────────────────────────────────────────────────────────
load_dotenv()
logger = logging.getLogger("dynamic-workflow-agent")

async def entrypoint(
    ctx: JobContext,
    project_id: str,
    room_name: str,
    user_data: Optional[Dict[str, Any]] = None,
):
    """Runs inside the agent worker once dispatched to a room."""
    # 1. Connect into the room (no args in v1.0)
    await ctx.connect()  
    logger.info(f"Connected to LiveKit room {room_name}")

    # 2. Bootstrap conversation logging
    session_id = str(uuid.uuid4())
    start_time = datetime.datetime.now().isoformat()
    conversation_log = ConversationLog(session_id=session_id, start_time=start_time)
    conversation_log.add_message("system", f"Initializing dynamic agent for project {project_id}")

    # 3. Load your dynamic workflow
    db = WorkflowDB()
    workflow_data = db.get_project_workflow(project_id)
    workflow_state = DynamicWorkflowState(workflow_data)

    # 4. Prepare user metadata container
    userdata = DynamicUserData(
        project_id=project_id,
        workflow_state=workflow_state,
        conversation_log=conversation_log,
        ctx=ctx,
        extracted_data=user_data or {},
    )

    # 5. Instantiate your agent and session
    agent = DynamicAgent(workflow_state)
    session = DynamicLoggingSession[DynamicUserData](userdata=userdata)

    # 6. Optionally save a pre-session snapshot
    conversation_log.save_to_file()

    # 7. Run the interactive loop
    try:
        logger.info("Starting agent session…")
        await session.start(agent=agent, room=ctx.room)
        logger.info("Agent session ended normally.")
    except Exception as e:
        logger.error("Error in session", exc_info=True)
        conversation_log.add_message("error", str(e))
    finally:
        # Always save your transcript
        conversation_log.save_to_file()
        logger.info("Final transcript saved.")


async def worker_entrypoint(ctx: JobContext):
    # metadata is on ctx.job.metadata in v1.0
    if not ctx.job.metadata:
        raise RuntimeError("No job metadata; cannot determine project/room!")
    data = json.loads(ctx.job.metadata)

    project_id = data["project_id"]
    room_name  = data["room_name"]
    user_data  = data.get("user_data", {})

    return await entrypoint(ctx, project_id, room_name, user_data)

def run_agent():
    """CLI entrypoint: register under 'conduit-agent' and wait for dispatches."""
    worker_options = WorkerOptions(
        entrypoint_fnc=worker_entrypoint,
        agent_name="conduit-agent",
    )
    cli.run_app(worker_options)

if __name__ == "__main__":
    run_agent()
