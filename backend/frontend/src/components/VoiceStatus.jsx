export default function VoiceStatus({

  isListening,

  isThinking,

  isSpeaking,

}) {

  let text = "Waiting...";
  let emoji = "💤";

  if (isListening) {
    text = "Listening...";
    emoji = "🎙";
  }

  else if (isThinking) {
    text = "Thinking...";
    emoji = "🤔";
  }

  else if (isSpeaking) {
    text = "Speaking...";
    emoji = "🔊";
  }

  return (

    <div className="voice-status">

      <div className="voice-status-emoji">

        {emoji}

      </div>

      <div className="voice-status-text">

        {text}

      </div>

    </div>

  );

}