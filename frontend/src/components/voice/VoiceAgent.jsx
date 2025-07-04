// VoiceAgent.jsx
import React, { useState, useEffect } from "react";
import "@livekit/components-styles";
import {
  useLiveKitRoom,
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
  BarVisualizer,
} from "@livekit/components-react";

export default function VoiceAgent({ 
    isOpen, 
    onClose, 
    projectId 
}) {
  const { htmlProps } = useLiveKitRoom();
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState("");
  const [connectNow, setConnectNow] = useState(false);

  // 1. Fetch credentials when opened
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const res = await fetch(import.meta.env.VITE_AGENT_ENDPOINT + "/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            user_data: {},
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("🎉 Got LiveKit details:", data);
        setServerUrl(data.serverUrl);
        setToken(data.participantToken);
      } catch (err) {
        console.error("Failed to fetch LiveKit credentials:", err);
      }
    })();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg px-8 py-6 w-96 relative">
        {/* Close button */}

        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-center">
                Test Call
            </h2>
            <button
                onClick={onClose}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg font-medium text-sm"
            >
                End Call
            </button>
        </div>

       
        {!connectNow ? (
          <div className="h-80 flex items-center justify-center">
            <button
              onClick={() => setConnectNow(true)}
              disabled={!serverUrl || !token}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <LiveKitRoom
            {...htmlProps}
            serverUrl={serverUrl}
            token={token}
            connect={true}
            audio
            video={false}

            // 3. debug hookup
            onConnected={() => console.log("✅ LiveKitRoom onConnected")}
            onDisconnected={() => console.log("⚠️ LiveKitRoom onDisconnected")}
          >
            <VoiceAssistantControlBar />
            <RoomAudioRenderer />
            <VoiceAgentContent />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}

// Renders once we're actually connected
function VoiceAgentContent() {
  const { state, audioTrack } = useVoiceAssistant();
  return (
    <div className="h-80 flex flex-col items-center justify-center">
      <BarVisualizer 
        state={state} 
        barCount={5} 
        trackRef={audioTrack} />
      <p className="mt-4 text-center">{state}</p>
    </div>
  );
}
