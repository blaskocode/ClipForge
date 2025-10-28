import { useState } from "react";
import "./App.css";

// Temporary placeholder types - will be refined in PR #3
interface Clip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  inPoint: number;
  outPoint: number;
}

function App() {
  const [clips, _setClips] = useState<Clip[]>([]);
  const [selectedClipId, _setSelectedClipId] = useState<string | null>(null);
  const [_playheadPosition, _setPlayheadPosition] = useState(0);

  return (
    <div className="app">
      <header>
        <h1>ClipForge</h1>
        <div className="header-controls">
          <p>Import video and export buttons will go here</p>
        </div>
      </header>

      {/* Video Player Area */}
      <div className="video-player-area">
        <div className="video-placeholder">
          <p>Video player will appear here</p>
          <p>Selected clip: {selectedClipId || "None"}</p>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="timeline-area">
        <div className="timeline-placeholder">
          <p>Timeline will appear here</p>
          <p>Clips count: {clips.length}</p>
        </div>
      </div>

      {/* Controls Area */}
      <div className="controls-area">
        <p>Trim controls and export button will go here</p>
      </div>
    </div>
  );
}

export default App;
