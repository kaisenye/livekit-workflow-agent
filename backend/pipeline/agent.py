import logging
import requests
from typing import Dict, Any, Generic

from livekit.agents.llm import function_tool
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import deepgram, openai, silero

from pipeline.models import DynamicUserData, DynamicWorkflowState, RunContext_DT, T

# Configure logging
logger = logging.getLogger("dynamic-workflow-agent")

class DynamicAgent(Agent):
    def __init__(self, workflow_state: DynamicWorkflowState) -> None:
        # Initialize with the start node's prompt
        start_node = workflow_state.get_current_node()
        
        super().__init__(
            instructions=start_node["prompt"] or "You are a helpful agent. Assist the user with their needs.",
            stt=deepgram.STT(),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=deepgram.TTS(model="aura-2-andromeda-en"),
            vad=silero.VAD.load()
        )
        self._current_node_id = start_node["id"]
        self._transition_tools = {}
        logger.info(f"DynamicAgent initialized at node: {start_node['title']}")
    
    async def on_start(self):
        """Called when the agent starts"""
        logger.info("Agent started")
        userdata = self.session.userdata
        if userdata.conversation_log:
            userdata.conversation_log.add_message("system", "Conversation started")
        await self.on_enter()
    
    async def on_enter(self) -> None:
        """Called when transitioning to a new node"""
        userdata: DynamicUserData = self.session.userdata
        workflow_state = userdata.workflow_state
        current_node = workflow_state.get_current_node()
        
        logger.info(f"Entering node: {current_node['title']}")
        
        # Update room participant attributes
        if userdata.ctx and userdata.ctx.room:
            await userdata.ctx.room.local_participant.set_attributes({"node": current_node["id"]})
        
        # Record transition in conversation log
        if userdata.conversation_log:
            userdata.conversation_log.record_decision(
                "node_transition", 
                {"to_node": current_node["id"], "node_title": current_node["title"]}
            )
        
        # Get available transitions (doesn't create tools anymore)
        next_nodes = self._generate_transition_tools()
        
        # Create a new chat context with the current node's prompt
        if current_node["id"] != self._current_node_id or True:  # Always update for now
            self._current_node_id = current_node["id"]
            
            # Update chat context with new instructions
            chat_ctx = self.chat_ctx.copy()
            
            # Build context info about available transitions
            transitions_info = """
                Available transitions (IMPORTANT: ONLY use these when the user clearly requests this topic):
            """
            
            for node in next_nodes:
                # Find the edge connecting to this node
                edge = workflow_state.get_edge_to_node(node["id"])
                condition = edge.get("prompt", "User requests this topic") if edge else "User requests this topic"
                
                transitions_info += f"""
                    - When user {condition}, 
                      call: transition(target_node_id=\"{node['id']}\") → {node['title']}
                """
            
            # Include extracted data as context
            extracted_data_str = ""
            if userdata.extracted_data:
                extracted_data_str = "\n\nUser data collected so far:\n"
                for key, value in userdata.extracted_data.items():
                    extracted_data_str += f"- {key}: {value}\n"
            
            system_prompt = f"""
                You are a helpful assistant for {workflow_state.workflow['project']['name']}.

                Current node: {current_node['title']}

                {current_node['prompt']}

                {transitions_info}
                {extracted_data_str}
                
                IMPORTANT: Wait for user input before making any transitions. Do NOT transition automatically.
            """
            
            # Log the full system prompt
            logger.info(f"===== SYSTEM PROMPT FOR NODE: {current_node['title']} =====")
            logger.info(system_prompt)
            
            chat_ctx.add_message(
                role="system",
                content=system_prompt
            )
            
            # Log the system prompt
            if userdata.conversation_log:
                userdata.conversation_log.add_message("system", f"Transitioned to node: {current_node['title']}")
                
            await self.update_chat_ctx(chat_ctx)
            
        # Execute tool if this is a tool node
        if current_node["node_type"] == "tool" and "tool" in current_node:
            await self._execute_tool(current_node["tool"])
        
        # Only generate initial response if we're at the start node
        # Otherwise wait for user input
        if current_node["node_type"] == "start":
            self.session.generate_reply()
    
    async def _execute_tool(self, tool_config: Dict[str, Any]):
        """Execute a tool based on its configuration"""
        logger.info(f"Executing tool: {tool_config['name']}")
        
        try:
            # Preprocess request data using extracted data from userdata
            userdata = self.session.userdata
            headers = tool_config.get("headers", {})
            body = tool_config.get("body", {})
            
            # Replace placeholders in headers and body with extracted data
            if headers:
                for key, value in headers.items():
                    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                        data_key = value[2:-2].strip()
                        if data_key in userdata.extracted_data:
                            headers[key] = userdata.extracted_data[data_key]
            
            if body:
                for key, value in body.items():
                    if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                        data_key = value[2:-2].strip()
                        if data_key in userdata.extracted_data:
                            body[key] = userdata.extracted_data[data_key]
            
            # Make the request
            method = tool_config.get("method", "GET").upper()
            endpoint = tool_config["endpoint"]
            
            response = None
            if method == "GET":
                response = requests.get(endpoint, headers=headers)
            elif method == "POST":
                response = requests.post(endpoint, headers=headers, json=body)
            elif method == "PUT":
                response = requests.put(endpoint, headers=headers, json=body)
            elif method == "DELETE":
                response = requests.delete(endpoint, headers=headers)
            
            if response and response.status_code < 400:
                # Log successful tool execution
                if userdata.conversation_log:
                    userdata.conversation_log.record_decision(
                        "tool_execution", 
                        {
                            "tool": tool_config["name"],
                            "success": True,
                            "response_status": response.status_code
                        }
                    )
                
                # Extract response data if needed for context
                try:
                    response_data = response.json()
                    # Process response data if needed
                    # For example, extract specific fields and add to context
                    
                except:
                    pass  # Non-JSON response
                
                return True
            else:
                # Log failed tool execution
                if userdata.conversation_log and response:
                    userdata.conversation_log.record_decision(
                        "tool_execution", 
                        {
                            "tool": tool_config["name"],
                            "success": False,
                            "response_status": response.status_code
                        }
                    )
                return False
                
        except Exception as e:
            logger.error(f"Error executing tool {tool_config['name']}: {e}")
            if self.session.userdata.conversation_log:
                self.session.userdata.conversation_log.add_message(
                    "error", f"Tool execution error: {str(e)}"
                )
            return False
    
    def _generate_transition_tools(self):
        """Generate a list of possible transitions for the system prompt"""
        # This method no longer creates dynamic functions, just logs transitions
        userdata = self.session.userdata
        workflow_state = userdata.workflow_state
        next_nodes = workflow_state.get_next_nodes()
        
        logger.info(f"Available transitions from current node:")
        for node in next_nodes:
            edge = workflow_state.get_edge_to_node(node["id"])
            edge_prompt = edge.get("prompt", "") if edge else ""
            logger.info(f"- Node: {node['id']} ({node['title']}) - Condition: {edge_prompt or 'No condition specified'}")
        
        # Return the next nodes for use in building the system prompt
        return next_nodes
    
    @function_tool
    async def transition(self, context: RunContext_DT, target_node_id: str) -> None:
        """Transition to a different node in the workflow"""
        userdata = context.userdata
        workflow_state = userdata.workflow_state
        
        # Get available nodes for logging
        available_nodes = [node["id"] for node in workflow_state.get_next_nodes()]
        logger.info(f"Attempting transition to {target_node_id}. Available nodes: {available_nodes}")
        
        # Try the transition
        success = workflow_state.transition_to(target_node_id)
        if success:
            logger.info(f"Successfully transitioned to node {target_node_id}")
            await self.on_enter()
            return f"Transitioned to node: {target_node_id}"
        else:
            logger.warning(f"Failed to transition to node {target_node_id} - not a valid transition")
            return f"Cannot transition to {target_node_id} from current state"
    
    async def on_speech_detected(self) -> None:
        """Called when speech is detected"""
        logger.debug("Speech detected")
        await super().on_speech_detected()
    
    async def on_transcript(self, is_final: bool, transcript: str) -> None:
        """Called when a transcript is received"""
        if is_final:
            logger.info(f"Final transcript: {transcript}")
        else:
            logger.debug(f"Interim transcript: {transcript}")
            
        await super().on_transcript(is_final, transcript)
        
        # Log final transcripts
        if is_final and transcript and self.session and self.session.userdata and self.session.userdata.conversation_log:
            self.session.userdata.conversation_log.add_message("user", transcript)
    
    async def on_llm_completion(self, completion: str) -> None:
        """Called when the LLM returns a completion"""
        logger.info(f"LLM completion: {completion[:50]}...")
        await super().on_llm_completion(completion)
        
        # Log agent responses
        if completion and self.session and self.session.userdata and self.session.userdata.conversation_log:
            self.session.userdata.conversation_log.add_message("agent", completion)
    
    @function_tool
    async def extract_data(self, context: RunContext_DT, key: str, value: str) -> None:
        """Extract and store data from the conversation"""
        userdata = context.userdata
        userdata.update_extracted_data(key, value)
        return f"Extracted {key}: {value}"

class DynamicLoggingSession(AgentSession, Generic[T]):
    """Custom session that adds logging hooks"""
    
    async def on_session_start(self):
        """Called when the session starts"""
        logger.info("Session started")
        if self.userdata and hasattr(self.userdata, 'conversation_log') and self.userdata.conversation_log:
            self.userdata.conversation_log.add_message("system", "Session started")
            # Force save to ensure we have at least one log file
            self.userdata.conversation_log.save_to_file()
            logger.info(f"Session start logged to {self.userdata.conversation_log.session_id}.json")
    
    async def on_session_end(self):
        """Called when the session ends"""
        logger.info("Session ended")
        if self.userdata and hasattr(self.userdata, 'conversation_log') and self.userdata.conversation_log:
            self.userdata.conversation_log.add_message("system", "Session ended")
            filepath = self.userdata.conversation_log.save_to_file()
            logger.info(f"Final session log saved to {filepath}")
            
    async def on_agent_start(self, agent: Agent):
        """Called when an agent starts"""
        logger.info(f"Agent {agent.__class__.__name__} started")
        if self.userdata and hasattr(self.userdata, 'conversation_log') and self.userdata.conversation_log:
            self.userdata.conversation_log.add_message("system", f"Agent {agent.__class__.__name__} started")
            
    async def on_agent_stop(self, agent: Agent):
        """Called when an agent stops"""
        logger.info(f"Agent {agent.__class__.__name__} stopped")
        if self.userdata and hasattr(self.userdata, 'conversation_log') and self.userdata.conversation_log:
            self.userdata.conversation_log.add_message("system", f"Agent {agent.__class__.__name__} stopped") 