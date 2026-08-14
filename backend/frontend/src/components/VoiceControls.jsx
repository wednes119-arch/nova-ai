import { FiMic, FiMicOff, FiPhoneOff } from "react-icons/fi";
import "../styles/voiceControls.css";

export default function VoiceControls({
  listening,
  onMic,
  onEnd,
}) {
  return (
    <div className="voice-controls">

      <button
        className={`control-btn ${listening ? "active" : ""}`}
        onClick={onMic}
        title={listening ? "Stop Listening" : "Start Listening"}
      >
        {listening ? <FiMicOff /> : <FiMic />}
      </button>

      <button
        className="control-btn end"
        onClick={onEnd}
        title="End Conversation"
      >
        <FiPhoneOff />
      </button>

    </div>
  );
}