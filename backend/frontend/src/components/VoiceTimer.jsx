import "../styles/voiceTimer.css";

export default function VoiceTimer({ seconds }) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="voice-timer">
      {mins}:{secs}
    </div>
  );
}