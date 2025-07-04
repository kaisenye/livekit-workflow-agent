import logging

# Configure shared logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger("dynamic-workflow-agent")
logger.setLevel(logging.DEBUG)

# Export key components for easy importing
from .models import ConversationLog, DynamicUserData, DynamicWorkflowState
from .db import WorkflowDB
from .agent import DynamicAgent, DynamicLoggingSession
from .runner import entrypoint, run_agent

__all__ = [
    'ConversationLog',
    'DynamicUserData', 
    'DynamicWorkflowState',
    'WorkflowDB',
    'DynamicAgent',
    'DynamicLoggingSession',
    'entrypoint',
    'run_agent'
] 