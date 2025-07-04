import datetime
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, TypeVar

from livekit.agents import JobContext
from livekit.agents.voice import RunContext

# Configure logging
logger = logging.getLogger("dynamic-workflow-agent")

# Define a type variable for the generic class
T = TypeVar('T')

@dataclass
class ConversationLog:
    """Stores conversation transcript and decisions for logging"""
    session_id: str
    start_time: str
    transcript: List[Dict[str, Any]] = field(default_factory=list)
    decisions: List[Dict[str, Any]] = field(default_factory=list)
    extracted_data: Dict[str, Any] = field(default_factory=dict)
    
    def add_message(self, role: str, content: str):
        """Add a message to the transcript"""
        timestamp = datetime.datetime.now().isoformat()
        self.transcript.append({
            "timestamp": timestamp,
            "role": role,
            "content": content
        })
        logger.debug(f"Added message to transcript: {role} - {content[:50]}...")
        self.save_to_file()
    
    def record_decision(self, decision_type: str, details: Dict[str, Any]):
        """Record a decision point in the conversation"""
        timestamp = datetime.datetime.now().isoformat()
        self.decisions.append({
            "timestamp": timestamp,
            "type": decision_type,
            "details": details
        })
        logger.debug(f"Recorded decision: {decision_type} - {str(details)[:50]}...")
        self.save_to_file()
    
    def update_extracted_data(self, data: Dict[str, Any]):
        """Update the extracted data with new information"""
        self.extracted_data.update(data)
        logger.debug(f"Updated extracted data: {str(data)[:50]}...")
        self.save_to_file()
    
    def save_to_file(self):
        """Save the conversation log to a JSON file"""
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
        os.makedirs(log_dir, exist_ok=True)
        
        filename = f"{self.session_id}.json"
        filepath = os.path.join(log_dir, filename)
        
        log_data = {
            "session_id": self.session_id,
            "start_time": self.start_time,
            "end_time": datetime.datetime.now().isoformat(),
            "transcript": self.transcript,
            "decisions": self.decisions,
            "extracted_data": self.extracted_data
        }
        
        try:
            with open(filepath, 'w') as f:
                json.dump(log_data, f, indent=2)
            logger.debug(f"Conversation log saved to {filepath}")
        except Exception as e:
            logger.error(f"Error saving conversation log: {e}")
        
        return filepath

class DynamicWorkflowState:
    def __init__(self, workflow_data: Dict[str, Any]):
        self.workflow = workflow_data
        self.node_map = {node["id"]: node for node in workflow_data["nodes"]}
        self.edge_map = self._build_edge_map(workflow_data["edges"])
        self.current_node_id = self._find_start_node_id()
        
    def _build_edge_map(self, edges: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Build a map of source_id to list of possible target edges"""
        edge_map = {}
        for edge in edges:
            source_id = edge["source_id"]
            if source_id not in edge_map:
                edge_map[source_id] = []
            edge_map[source_id].append(edge)
        return edge_map
    
    def _find_start_node_id(self) -> str:
        """Find the start node ID"""
        for node in self.workflow["nodes"]:
            if node["node_type"] == "start":
                return node["id"]
        raise ValueError("No start node found in workflow")
    
    def get_current_node(self) -> Dict[str, Any]:
        """Get the current node"""
        return self.node_map[self.current_node_id]
    
    def get_next_nodes(self) -> List[Dict[str, Any]]:
        """Get all possible next nodes from the current position"""
        if self.current_node_id not in self.edge_map:
            return []
        
        next_nodes = []
        for edge in self.edge_map[self.current_node_id]:
            target_id = edge["target_id"]
            if target_id in self.node_map:
                next_node = self.node_map[target_id].copy()
                next_node["edge"] = edge
                next_nodes.append(next_node)
        
        return next_nodes
    
    def transition_to(self, node_id: str) -> bool:
        """Transition to a specific node if it's a valid next node"""
        next_nodes = self.get_next_nodes()
        for node in next_nodes:
            if node["id"] == node_id:
                self.current_node_id = node_id
                return True
        return False

    def get_edge_to_node(self, target_node_id: str) -> Optional[Dict[str, Any]]:
        """Get the edge that connects the current node to the target node"""
        current_node_id = self.current_node_id
        for edge in self.workflow["edges"]:
            if edge["source_id"] == current_node_id and edge["target_id"] == target_node_id:
                return edge
        return None

@dataclass
class DynamicUserData:
    project_id: str
    workflow_state: Optional[DynamicWorkflowState] = None
    conversation_log: Optional[ConversationLog] = None
    ctx: Optional[JobContext] = None
    extracted_data: Dict[str, Any] = field(default_factory=dict)
    
    def update_extracted_data(self, key: str, value: Any):
        """Update extracted data"""
        self.extracted_data[key] = value
        if self.conversation_log:
            self.conversation_log.update_extracted_data({key: value})

# Type alias for RunContext with our user data
RunContext_DT = RunContext[DynamicUserData] 