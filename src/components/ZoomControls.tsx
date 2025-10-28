import React from 'react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomChange: (zoomLevel: number) => void;
  onZoomToFit: () => void;
  totalDuration: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomChange,
  onZoomToFit,
  totalDuration,
}) => {
  const zoomLevels = [0.25, 0.5, 1, 2, 5, 10, 20];
  const currentZoomIndex = zoomLevels.findIndex(level => Math.abs(level - zoomLevel) < 0.01);
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getZoomLabel = () => {
    if (zoomLevel < 1) {
      return `${Math.round(zoomLevel * 100)}%`;
    } else {
      return `${Math.round(zoomLevel)}x`;
    }
  };

  return (
    <div className="zoom-controls">
      <div className="zoom-controls-header">
        <h3>Timeline Zoom</h3>
        <span className="zoom-level">{getZoomLabel()}</span>
      </div>
      
      <div className="zoom-controls-content">
        <div className="zoom-slider-container">
          <div className="zoom-slider-wrapper">
            <input
              type="range"
              min="0"
              max={zoomLevels.length - 1}
              value={currentZoomIndex}
              onChange={(e) => onZoomChange(zoomLevels[parseInt(e.target.value)])}
              className="zoom-slider"
            />
          </div>
        </div>
        
        <div className="zoom-actions">
          <button
            onClick={onZoomToFit}
            className="zoom-fit-button"
            title="Zoom to Fit (Cmd+0)"
          >
            Fit to Screen
          </button>
        </div>
        
        <div className="timeline-info">
          <div className="timeline-duration">
            <span className="label">Total Duration:</span>
            <span className="value">{formatDuration(totalDuration)}</span>
          </div>
          <div className="timeline-resolution">
            <span className="label">Resolution:</span>
            <span className="value">
              {zoomLevel >= 20 ? 'Frame-accurate' : 'Standard'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
