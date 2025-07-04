import os
import logging
from typing import Dict, Any

# Configure logging
logger = logging.getLogger("dynamic-workflow-agent")

class WorkflowDB:
    def __init__(self, connection_string: str = None):
        # Connection string is kept for backward compatibility but not used anymore
        pass
    
    def get_project_workflow(self, project_id: str) -> Dict[str, Any]:
        """Fetch project, nodes, edges and tools for a project using Supabase"""
        # Check if Supabase environment variables are set
        if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
            logger.error("Supabase configuration missing: SUPABASE_URL and SUPABASE_KEY must be set in environment")
            logger.info("Using mock data for testing")
            return self._get_mock_project_workflow(project_id)
        
        try:
            return self._get_workflow_from_supabase(project_id)
        except Exception as e:
            logger.error(f"Error connecting to Supabase: {e}")
            logger.info("Using mock data for testing")
            return self._get_mock_project_workflow(project_id)
    
    def _get_workflow_from_supabase(self, project_id: str) -> Dict[str, Any]:
        """Fetch workflow data from Supabase"""
        try:
            from supabase import create_client
            
            # Get Supabase credentials from environment
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            logger.info(f"Connecting to Supabase at {supabase_url}")
            
            # Initialize Supabase client
            supabase = create_client(supabase_url, supabase_key)
            
            # Get project info
            logger.info(f"Fetching project with id {project_id}")
            project_response = supabase.table("projects").select("*").eq("id", project_id).execute()
            if not project_response.data or len(project_response.data) == 0:
                raise ValueError(f"Project with id {project_id} not found")
            
            project = project_response.data[0]
            logger.info(f"Found project: {project['name']}")
            
            # Get nodes with tools
            logger.info(f"Fetching nodes for project {project_id}")
            nodes_response = supabase.table("nodes") \
                .select("*, tools(*)") \
                .eq("project_id", project_id) \
                .execute()
            
            # Transform the response to match our structure
            nodes = []
            for node_data in nodes_response.data:
                node = {
                    "id": node_data["id"],
                    "title": node_data["title"],
                    "prompt": node_data["prompt"],
                    "node_type": node_data["node_type"],
                    "tool_id": node_data.get("tool_id")
                }
                
                # Add tool data if it exists
                if node_data.get("tools") and node_data["tools"]:
                    tool_data = node_data["tools"]
                    node["tool"] = {
                        "name": tool_data["name"],
                        "endpoint": tool_data["endpoint"],
                        "method": tool_data["method"],
                        "headers": tool_data["headers"],
                        "body": tool_data["body"]
                    }
                
                nodes.append(node)
            
            logger.info(f"Found {len(nodes)} nodes")
            
            # Get edges
            logger.info(f"Fetching edges for project {project_id}")
            edges_response = supabase.table("edges") \
                .select("*") \
                .eq("project_id", project_id) \
                .execute()
            
            edges = []
            for edge_data in edges_response.data:
                edges.append({
                    "id": edge_data["id"],
                    "source_id": edge_data["source_id"],
                    "target_id": edge_data["target_id"],
                    "label": edge_data.get("label"),
                    "prompt": edge_data.get("prompt")
                })
            
            logger.info(f"Found {len(edges)} edges")
            
            return {
                "project": {
                    "id": project["id"],
                    "name": project["name"],
                    "description": project.get("description")
                },
                "nodes": nodes,
                "edges": edges
            }
            
        except ImportError:
            logger.error("supabase-py not installed. Install with: pip install supabase")
            raise
    
    def _get_mock_project_workflow(self, project_id: str) -> Dict[str, Any]:
        """Return mock workflow data for testing"""
        logger.warning("Using mock data for workflow - this should not be used in production!")
        return {
            "project": {
                "id": project_id,
                "name": "Test Project",
                "description": "A test workflow project"
            },
            "nodes": [
                {
                    "id": "start_node",
                    "title": "Start",
                    "prompt": "Welcome to our service! How can I help you today?",
                    "node_type": "start",
                    "tool_id": None
                },
                {
                    "id": "info_node",
                    "title": "Information",
                    "prompt": "I'd be happy to provide more information. What would you like to know?",
                    "node_type": "default",
                    "tool_id": None
                },
                {
                    "id": "booking_node",
                    "title": "Booking",
                    "prompt": "Let's help you with a booking. What date are you looking for?",
                    "node_type": "default",
                    "tool_id": None
                },
                {
                    "id": "end_node",
                    "title": "End",
                    "prompt": "Thank you for using our service. Is there anything else I can help with?",
                    "node_type": "default",
                    "tool_id": None
                }
            ],
            "edges": [
                {
                    "id": "edge_1",
                    "source_id": "start_node",
                    "target_id": "info_node",
                    "label": "Information",
                    "prompt": "User wants information"
                },
                {
                    "id": "edge_2",
                    "source_id": "start_node",
                    "target_id": "booking_node",
                    "label": "Booking",
                    "prompt": "User wants to make a booking"
                },
                {
                    "id": "edge_3",
                    "source_id": "info_node",
                    "target_id": "end_node",
                    "label": "Finish",
                    "prompt": "User received information"
                },
                {
                    "id": "edge_4",
                    "source_id": "booking_node",
                    "target_id": "end_node",
                    "label": "Finish",
                    "prompt": "User completed booking"
                }
            ]
        } 