export default function VoiceVisualizer({
  voiceLevel = 0,
  active = false,
}) {
  const bars = Array.from({ length: 40 });

  return (
    <div className="voice-visualizer">
      {bars.map((_, index) => {
        const wavePosition = Math.sin(index * 0.7);
        const variation = 0.7 + Math.abs(wavePosition) * 0.6;

        const height = active
          ? Math.max(
              8,
              Math.min(
                70,
                8 + (voiceLevel / 255) * 60 * variation
              )
            )
          : 8;

        return (
          <span
            key={index}
            className={`voice-bar ${
              active ? "active" : ""
            }`}
            style={{
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
}