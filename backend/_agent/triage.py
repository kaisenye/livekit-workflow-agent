import logging
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional, Dict, List, Any, TypeVar, Generic
import json
import os
import datetime
import uuid

from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.llm import function_tool
from livekit.agents.voice import Agent, AgentSession, RunContext
from livekit.plugins import cartesia, deepgram, openai, silero

from utils import load_prompt

# Configure more detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("hospitality-service-desk")
logger.setLevel(logging.DEBUG)  # Set to DEBUG for more verbose logging

load_dotenv()

# Define a type variable for the generic class
T = TypeVar('T')

class WorkflowState(Enum):
    GREETING = auto()
    BOOKING = auto()
    AMENITIES = auto()
    ISSUES = auto()
    BILLING = auto()

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

@dataclass
class UserData:
    """User data with essential information"""
    current_state: WorkflowState = WorkflowState.GREETING
    guest_name: Optional[str] = None
    room_number: Optional[str] = None
    ctx: Optional[JobContext] = None
    conversation_log: Optional[ConversationLog] = None

    def summarize(self) -> str:
        summary = ["Guest information:"]
        if self.guest_name:
            summary.append(f"Name: {self.guest_name}")
        if self.room_number:
            summary.append(f"Room: {self.room_number}")
        
        return "\n".join(summary) if len(summary) > 1 else "No guest information recorded yet."
    
    def update_extracted_data(self):
        """Update the extracted data in the conversation log"""
        if self.conversation_log:
            extracted_data = {
                "guest_name": self.guest_name,
                "room_number": self.room_number
            }
            # Remove None values
            extracted_data = {k: v for k, v in extracted_data.items() if v is not None}
            self.conversation_log.update_extracted_data(extracted_data)

RunContext_T = RunContext[UserData]

class HospitalityAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=load_prompt('greeting_prompt.yaml'),
            stt=deepgram.STT(),
            llm=openai.LLM(model="gpt-4o-mini"),
            tts=cartesia.TTS(voice="78ab82d5-25be-4f7d-82b3-7ad64e5b85b2"),
            vad=silero.VAD.load()
        )
        self._current_prompt = 'greeting_prompt.yaml'
        logger.info("HospitalityAgent initialized")
    
    async def on_start(self):
        """Called when the agent starts"""
        logger.info("Agent started")
        userdata = self.session.userdata
        if userdata.conversation_log:
            userdata.conversation_log.add_message("system", "Conversation started")
        await self.on_enter()
    
    async def on_enter(self) -> None:
        """Called when the agent is started or when the state changes"""
        userdata: UserData = self.session.userdata
        state_name = userdata.current_state.name.lower()
        
        logger.info(f"Entering state: {state_name}")

        # Update room participant attributes with current state
        if userdata.ctx and userdata.ctx.room:
            await userdata.ctx.room.local_participant.set_attributes({"state": state_name})
        
        # Record state transition in conversation log
        if userdata.conversation_log:
            userdata.conversation_log.record_decision(
                "state_transition", 
                {"from": self._current_prompt.replace("_prompt.yaml", ""), 
                 "to": state_name}
            )
        
        # Load the appropriate prompt for the current state
        prompt_file = f"{state_name.lower()}_prompt.yaml"
        if prompt_file != self._current_prompt:
            self._current_prompt = prompt_file
            new_instructions = load_prompt(prompt_file)
            
            # Create a new chat context with the updated instructions
            chat_ctx = self.chat_ctx.copy()
            system_prompt = f"You are the Hospitality Service Agent. Be concise and casual. Current state: {state_name}.\n\n{new_instructions}\n\n{userdata.summarize()}"
            chat_ctx.add_message(
                role="system",
                content=system_prompt
            )
            
            # Log the system prompt
            if userdata.conversation_log:
                userdata.conversation_log.add_message("system", f"State changed to: {state_name}")
                
            await self.update_chat_ctx(chat_ctx)
            
        # Generate initial response when entering a new state
        self.session.generate_reply()
    
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
    
    async def on_tts_started(self) -> None:
        """Called when TTS starts"""
        logger.debug("TTS started")
        await super().on_tts_started()
    
    async def on_tts_ended(self) -> None:
        """Called when TTS ends"""
        logger.debug("TTS ended")
        await super().on_tts_ended()
    
    async def on_llm_start(self) -> None:
        """Called when LLM starts generating"""
        logger.debug("LLM started generating")
        await super().on_llm_start()
    
    async def on_llm_completion(self, completion: str) -> None:
        """Called when the LLM returns a completion"""
        logger.info(f"LLM completion: {completion[:50]}...")
        await super().on_llm_completion(completion)
        
        # Log agent responses
        if completion and self.session and self.session.userdata and self.session.userdata.conversation_log:
            self.session.userdata.conversation_log.add_message("agent", completion)
    
    async def on_llm_error(self, error: Exception) -> None:
        """Called when the LLM encounters an error"""
        logger.error(f"LLM error: {error}")
        if self.session and self.session.userdata and self.session.userdata.conversation_log:
            self.session.userdata.conversation_log.add_message("error", f"LLM error: {str(error)}")
        await super().on_llm_error(error)
    
    @function_tool
    async def transition_to_booking(self, context: RunContext_T) -> None:
        """Transition to the booking/reservation state"""
        userdata = context.userdata
        userdata.current_state = WorkflowState.BOOKING
        await self.on_enter()
    
    @function_tool
    async def transition_to_amenities(self, context: RunContext_T) -> None:
        """Transition to the amenities information state"""
        userdata = context.userdata
        userdata.current_state = WorkflowState.AMENITIES
        await self.on_enter()
    
    @function_tool
    async def transition_to_issues(self, context: RunContext_T) -> None:
        """Transition to the problem/issues resolution state"""
        userdata = context.userdata
        userdata.current_state = WorkflowState.ISSUES
        await self.on_enter()
    
    @function_tool
    async def transition_to_billing(self, context: RunContext_T) -> None:
        """Transition to the billing state"""
        userdata = context.userdata
        userdata.current_state = WorkflowState.BILLING
        await self.on_enter()
    
    @function_tool
    async def transition_to_greeting(self, context: RunContext_T) -> None:
        """Transition back to the greeting/main menu state"""
        userdata = context.userdata
        userdata.current_state = WorkflowState.GREETING
        await self.on_enter()
    
    @function_tool
    async def update_guest_info(self, context: RunContext_T, guest_name: Optional[str] = None, 
                               room_number: Optional[str] = None) -> None:
        """Update the guest information in the session data"""
        userdata = context.userdata
        
        # Track what's being updated for logging
        updates = {}
        
        if guest_name:
            userdata.guest_name = guest_name
            updates["guest_name"] = guest_name
        if room_number:
            userdata.room_number = room_number
            updates["room_number"] = room_number
        
        # Log the data extraction
        if userdata.conversation_log and updates:
            userdata.conversation_log.record_decision(
                "data_extraction", 
                {"fields_updated": updates}
            )
            userdata.update_extracted_data()
            
        return f"Updated guest information: {userdata.summarize()}"
    
    @function_tool
    async def save_conversation_log(self, context: RunContext_T) -> str:
        """Save the current conversation log to a file"""
        userdata = context.userdata
        if userdata.conversation_log:
            filepath = userdata.conversation_log.save_to_file()
            return f"Conversation log saved to {filepath}"
        return "No conversation log available to save"

class ConversationLoggingSession(AgentSession, Generic[T]):
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

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    logger.info("Connected to LiveKit")

    # Create a unique session ID and initialize the conversation log
    session_id = str(uuid.uuid4())
    start_time = datetime.datetime.now().isoformat()
    conversation_log = ConversationLog(session_id=session_id, start_time=start_time)
    logger.info(f"Created conversation log with session ID: {session_id}")
    
    # Add initial system message
    conversation_log.add_message("system", "Initializing hospitality service agent")
    
    # Initialize userdata with conversation log
    userdata = UserData(ctx=ctx, conversation_log=conversation_log)
    agent = HospitalityAgent()
    logger.debug(f"Created agent: {agent.__class__.__name__}")

    # Log initial system state
    logger.debug(f"Initial state: {userdata.current_state.name}")
    conversation_log.add_message("system", f"Initial state: {userdata.current_state.name}")
    
    # Manual save before session creation
    filepath = conversation_log.save_to_file()
    logger.info(f"Pre-session log saved to {filepath}")

    # Use custom session class
    session = ConversationLoggingSession[UserData](userdata=userdata)
    logger.info("Session created, starting agent")

    try:
        # Save initial state before starting
        conversation_log.save_to_file()
        
        # Start the session
        logger.info("Starting session now...")
        await session.start(
            agent=agent,
            room=ctx.room,
        )
        logger.info("Session completed normally")
    except Exception as e:
        logger.error(f"Error in session: {e}", exc_info=True)
        if conversation_log:
            conversation_log.add_message("error", f"Session error: {str(e)}")
    finally:
        # Save the conversation log when the session ends
        logger.info("Session ending, saving final log")
        if conversation_log:
            filepath = conversation_log.save_to_file()
            logger.info(f"Final log saved to {filepath}")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))