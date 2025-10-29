import React from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Spacebar', description: 'Play/Pause' },
    { key: 'Delete / Backspace', description: 'Delete selected clip' },
    { key: 'I', description: 'Set in-point at playhead' },
    { key: 'O', description: 'Set out-point at playhead' },
    { key: 'S', description: 'Split clip at playhead' },
    { key: '← / →', description: 'Seek backward/forward 5 seconds' },
    { key: 'Cmd+← / Ctrl+←', description: 'Jump to start of timeline' },
    { key: 'J', description: 'Seek backward 5 seconds' },
    { key: 'K', description: 'Play/Pause (alternative)' },
    { key: 'L', description: 'Seek forward 5 seconds' },
    { key: 'Home', description: 'Jump to start of timeline' },
    { key: 'End', description: 'Jump to end of timeline' },
    { key: 'Cmd+N / Ctrl+N', description: 'New Project' },
    { key: 'Cmd+R / Ctrl+R', description: 'Start Recording' },
    { key: 'Cmd+E / Ctrl+E', description: 'Quick Export' },
    { key: 'Cmd+Z / Ctrl+Z', description: 'Undo' },
    { key: 'Cmd+Shift+Z / Ctrl+Y', description: 'Redo' },
    { key: 'Cmd+S / Ctrl+S', description: 'Save Project' },
    { key: 'Cmd+O / Ctrl+O', description: 'Open Project' },
    { key: 'Cmd++ / Ctrl++', description: 'Zoom In' },
    { key: 'Cmd+- / Ctrl+-', description: 'Zoom Out' },
    { key: 'Cmd+0 / Ctrl+0', description: 'Zoom to Fit' },
    { key: '?', description: 'Show this help' },
    { key: 'Esc', description: 'Close dialogs' },
  ];

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="keyboard-shortcuts-content">
          <div className="shortcuts-section">
            <h3>Playback</h3>
            <div className="shortcuts-list">
              {shortcuts.slice(0, 1).map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <span className="shortcut-key">{shortcut.key}</span>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shortcuts-section">
            <h3>Editing</h3>
            <div className="shortcuts-list">
              {shortcuts.slice(1, 6).map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <span className="shortcut-key">{shortcut.key}</span>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shortcuts-section">
            <h3>Navigation</h3>
            <div className="shortcuts-list">
              {shortcuts.slice(6, 12).map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <span className="shortcut-key">{shortcut.key}</span>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shortcuts-section">
            <h3>Project & Export</h3>
            <div className="shortcuts-list">
              {shortcuts.slice(12, 18).map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <span className="shortcut-key">{shortcut.key}</span>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shortcuts-section">
            <h3>General</h3>
            <div className="shortcuts-list">
              {shortcuts.slice(22).map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <span className="shortcut-key">{shortcut.key}</span>
                  <span className="shortcut-description">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
