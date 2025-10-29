import { useState, useEffect } from 'react';
import { Clip } from '../types';
import './../styles/export-settings.css';

export type ExportResolution = '720p' | '1080p' | 'source';

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (resolution: ExportResolution, width: number, height: number) => void;
  clips: Clip[];
}

interface ResolutionOption {
  label: string;
  value: ExportResolution;
  width: number;
  height: number;
}

export function ExportSettingsModal({
  isOpen,
  onClose,
  onExport,
  clips,
}: ExportSettingsModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<ExportResolution>('720p');
  
  // Calculate source resolution (max dimensions from all clips)
  // FFmpeg requires even dimensions, so round down to nearest even number
  const sourceResolution = clips.length > 0 
    ? {
        width: Math.floor(Math.max(...clips.map(c => c.width)) / 2) * 2,
        height: Math.floor(Math.max(...clips.map(c => c.height)) / 2) * 2,
      }
    : { width: 1920, height: 1080 };

  // Resolution options
  const resolutionOptions: ResolutionOption[] = [
    { label: '720p (1280×720)', value: '720p', width: 1280, height: 720 },
    { label: '1080p (1920×1080)', value: '1080p', width: 1920, height: 1080 },
    { 
      label: `Source (${sourceResolution.width}×${sourceResolution.height})`, 
      value: 'source', 
      width: sourceResolution.width, 
      height: sourceResolution.height 
    },
  ];

  const selectedOption = resolutionOptions.find(opt => opt.value === selectedResolution) || resolutionOptions[0];
  const isUpscaling = selectedOption.width > sourceResolution.width || selectedOption.height > sourceResolution.height;

  // Handle export
  const handleExport = () => {
    const option = resolutionOptions.find(opt => opt.value === selectedResolution);
    if (option) {
      onExport(selectedResolution, option.width, option.height);
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="export-settings-overlay" onClick={onClose}>
      <div className="export-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-settings-header">
          <h2>Export Settings</h2>
          <button className="close-button" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>
        
        <div className="export-settings-content">
          <div className="resolution-selector">
            <label htmlFor="resolution-select">Export Resolution</label>
            <select
              id="resolution-select"
              value={selectedResolution}
              onChange={(e) => setSelectedResolution(e.target.value as ExportResolution)}
            >
              {resolutionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isUpscaling && selectedResolution !== 'source' && (
            <div className="upscaling-warning">
              <span className="warning-icon">⚠️</span>
              <div className="warning-text">
                <strong>Upscaling Detected</strong>
                <p>
                  Exporting at {selectedOption.width}×{selectedOption.height} from source resolution of {sourceResolution.width}×{sourceResolution.height}. 
                  Quality may be reduced.
                </p>
              </div>
            </div>
          )}

          <div className="resolution-preview">
            <div className="preview-info">
              <strong>Export Resolution:</strong> {selectedOption.width} × {selectedOption.height}
              {selectedResolution === 'source' && (
                <span className="source-note"> (Maintains original quality)</span>
              )}
            </div>
          </div>
        </div>

        <div className="export-settings-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="export-button" onClick={handleExport}>
            Export Video
          </button>
        </div>
      </div>
    </div>
  );
}

