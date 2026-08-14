import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

import VoiceOrb from "./VoiceOrb";
import VoiceVisualizer from "./VoiceVisualizer";
import VoiceControls from "./VoiceControls";

import "../styles/voiceModal.css";

export default function VoiceModal({
  open,
  onClose,
  onMic,
  isListening,
  isThinking,
  isSpeaking,
  voiceLevel,
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!open) return;

    setSeconds(0);

    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(seconds % 60).padStart(2, "0");

  let status = "Waiting...";
  if (isListening) status = "Listening...";
  if (isThinking) status = "Thinking...";
  if (isSpeaking) status = "Speaking...";

  return (
  <div className="voice-overlay">
    <div className="voice-modal">

      <button className="voice-close" onClick={onClose}>
        <FiX />
      </button>

      <div className="voice-header">
        <div className="voice-avatar">
          🤖
        </div>

        <h2>Nova AI</h2>
        <p>AI Voice Assistant</p>
      </div>

      <div className="voice-time">
        {min}:{sec}
      </div>

      <VoiceOrb
        isListening={isListening}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
      />

      <VoiceVisualizer
        voiceLevel={voiceLevel}
        active={isListening || isSpeaking}
      />

      <div className="voice-status">
        {status}
      </div>

      <VoiceControls
        listening={isListening}
        onMic={onMic}
        onEnd={onClose}
      />

    </div>
  </div>
);
}