import "../styles/typing.css";

export default function TypingIndicator() {
  return (
    <div className="typing-row">
      <div className="typing-content">

        {/* AI Avatar */}
        <div className="typing-avatar">
          N
        </div>

        {/* Typing Animation */}
        <div className="typing-dots" aria-label="Nova AI is typing">
          <span></span>
          <span></span>
          <span></span>
        </div>

      </div>
    </div>
  );
}