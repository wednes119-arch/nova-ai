import { FiMic, FiVolume2 } from "react-icons/fi";
import "../styles/voiceSettings.css";

export default function VoiceSettings({
  sensitivity = 60,
  volume = 100,
  onSensitivityChange = () => {},
  onVolumeChange = () => {},
}) {
  return (
    <div className="voice-settings">

      <div className="setting-row">
        <FiMic className="setting-icon" />

        <div className="setting-info">
          <span>Microphone Sensitivity</span>

          <input
            type="range"
            min="0"
            max="100"
            value={sensitivity}
            onChange={(e) =>
              onSensitivityChange(Number(e.target.value))
            }
          />
        </div>

        <strong>{sensitivity}%</strong>
      </div>

      <div className="setting-row">
        <FiVolume2 className="setting-icon" />

        <div className="setting-info">
          <span>Speaker Volume</span>

          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) =>
              onVolumeChange(Number(e.target.value))
            }
          />
        </div>

        <strong>{volume}%</strong>
      </div>

    </div>
  );
}