import "../styles/voiceOrb.css";

export default function VoiceOrb({
  isListening,
  isThinking,
  isSpeaking,
}) {
  return (
    <div className="voice-orb-wrapper">

      <div className="voice-ring ring1"></div>
      <div className="voice-ring ring2"></div>
      <div className="voice-ring ring3"></div>

      <div
        className={`voice-orb-core ${
          isListening
            ? "listening"
            : isThinking
            ? "thinking"
            : isSpeaking
            ? "speaking"
            : ""
        }`}
      >
        <div className="orb-inner"></div>
      </div>

    </div>
  );
}