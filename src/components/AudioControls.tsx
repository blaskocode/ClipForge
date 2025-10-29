import React from 'react';

import { Clip } from '../types';

interface AudioControlsProps {
  selectedClip: Clip | null;
  onVolumeChange: (clipId: string, volume: number) => void;
  onMuteToggle: (clipId: string, muted: boolean) => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  selectedClip,
  onVolumeChange,
  onMuteToggle,
}) => {
  if (!selectedClip) {
    return (
      <div className="audio-controls">
        <div className="audio-controls-placeholder">
          Select a clip to adjust audio
        </div>
      </div>
    );
  }

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseInt(event.target.value);
    onVolumeChange(selectedClip.id, volume);
  };

  const handleMuteToggle = () => {
    onMuteToggle(selectedClip.id, !selectedClip.muted);
  };

  return (
    <div className="audio-controls">
      <div className="audio-controls-header">
        <h3>Audio Controls</h3>
        <span className="clip-name">{selectedClip.filename}</span>
      </div>
      
      <div className="audio-controls-content">
        <div className="volume-control">
          <label htmlFor="volume-slider">Volume</label>
          <div className="volume-slider-container">
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="200"
              value={selectedClip.muted ? 0 : selectedClip.volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              disabled={selectedClip.muted}
            />
            <span className="volume-display">
              {selectedClip.muted ? 'Muted' : `${selectedClip.volume}%`}
            </span>
          </div>
        </div>
        
        <div className="mute-control">
          <button
            onClick={handleMuteToggle}
            className={`mute-button ${selectedClip.muted ? 'muted' : ''}`}
            title={selectedClip.muted ? 'Unmute' : 'Mute'}
          >
            {selectedClip.muted ? '🔇' : '🔊'}
          </button>
          <span className="mute-label">
            {selectedClip.muted ? 'Muted' : 'Unmuted'}
          </span>
        </div>
      </div>
    </div>
  );
};
