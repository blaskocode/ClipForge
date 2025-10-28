import { useState, useEffect } from "react";

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

interface TrimControlsProps {
  selectedClip: Clip | null;
  playheadPosition: number;
  onTrimChange: (clipId: string, inPoint: number, outPoint: number) => void;
  clips: Clip[]; // Need all clips to calculate local time from timeline position
  clipAtPlayhead: { clip: Clip; localTime: number } | null; // Current clip and video time
}

export function TrimControls({ selectedClip, playheadPosition, onTrimChange, clips, clipAtPlayhead }: TrimControlsProps) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [inPointInput, setInPointInput] = useState("0.000");
  const [outPointInput, setOutPointInput] = useState("0.000");
  const [inPointError, setInPointError] = useState(false);
  const [outPointError, setOutPointError] = useState(false);

  // Sync local state with selected clip
  useEffect(() => {
    if (selectedClip) {
      setInPoint(selectedClip.inPoint);
      setOutPoint(selectedClip.outPoint);
      setInPointInput(selectedClip.inPoint.toFixed(3));
      setOutPointInput(selectedClip.outPoint.toFixed(3));
      setInPointError(false);
      setOutPointError(false);
    }
  }, [selectedClip]);

  // Keyboard shortcuts (I/O keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Skip if no clip is selected
      if (!selectedClip) return;

      // I key - Set In Point
      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        handleSetInPoint();
      }

      // O key - Set Out Point
      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        handleSetOutPoint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedClip, playheadPosition, inPoint, outPoint, clips]);

  const validateTrimPoints = (newInPoint: number, newOutPoint: number): boolean => {
    if (!selectedClip) return false;

    const MIN_DURATION = 0.033; // Frame-accurate for 30fps

    // Check basic constraints
    if (newInPoint < 0 || newOutPoint > selectedClip.duration) {
      return false;
    }

    // Check that in-point is before out-point with minimum duration
    if (newOutPoint - newInPoint < MIN_DURATION) {
      return false;
    }

    return true;
  };

  const clampValue = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  const snapToFrame = (value: number): number => {
    // Snap to nearest frame boundary (0.033s for 30fps)
    const FRAME_DURATION = 0.033;
    return Math.round(value / FRAME_DURATION) * FRAME_DURATION;
  };


  const handleSetInPoint = () => {
    if (!selectedClip) return;

    // Timeline uses FULL clip durations (non-destructive editing)
    const selectedIndex = clips.findIndex(c => c.id === selectedClip.id);
    if (selectedIndex === -1) return;

    // Find where this clip starts on the timeline (sum of full durations before it)
    let timelineStartOfClip = 0;
    for (let i = 0; i < selectedIndex; i++) {
      timelineStartOfClip += clips[i].duration; // Use full duration
    }

    // How far into this clip on the timeline?
    const offsetIntoClip = playheadPosition - timelineStartOfClip;
    
    // This IS the absolute video time (1:1 mapping)
    const newInPoint = clampValue(offsetIntoClip, 0, selectedClip.duration);
    
    // Validate against current out-point
    if (validateTrimPoints(newInPoint, outPoint)) {
      setInPoint(newInPoint);
      setInPointInput(newInPoint.toFixed(3));
      setInPointError(false);
      onTrimChange(selectedClip.id, newInPoint, outPoint);
    } else {
      setInPointError(true);
    }
  };

  const handleSetOutPoint = () => {
    if (!selectedClip) return;

    // Timeline uses FULL clip durations (non-destructive editing)
    const selectedIndex = clips.findIndex(c => c.id === selectedClip.id);
    if (selectedIndex === -1) return;

    // Find where this clip starts on the timeline (sum of full durations before it)
    let timelineStartOfClip = 0;
    for (let i = 0; i < selectedIndex; i++) {
      timelineStartOfClip += clips[i].duration; // Use full duration
    }

    // How far into this clip on the timeline?
    const offsetIntoClip = playheadPosition - timelineStartOfClip;
    
    // This IS the absolute video time (1:1 mapping)
    const newOutPoint = clampValue(offsetIntoClip, 0, selectedClip.duration);
    
    // Validate against current in-point
    if (validateTrimPoints(inPoint, newOutPoint)) {
      setOutPoint(newOutPoint);
      setOutPointInput(newOutPoint.toFixed(3));
      setOutPointError(false);
      onTrimChange(selectedClip.id, inPoint, newOutPoint);
    } else {
      setOutPointError(true);
    }
  };

  const handleInPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Store raw input string - allows typing decimals like "1.438"
    setInPointInput(e.target.value);
    
    // Update numeric value if valid (for button handlers)
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setInPoint(value);
    }
  };

  const handleOutPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Store raw input string - allows typing decimals like "1.438"
    setOutPointInput(e.target.value);
    
    // Update numeric value if valid (for button handlers)
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setOutPoint(value);
    }
  };

  const handleInPointBlur = () => {
    if (!selectedClip) return;

    // Snap to frame boundary, then clamp to valid range
    const snappedInPoint = snapToFrame(inPoint);
    const clampedInPoint = clampValue(snappedInPoint, 0, selectedClip.duration);
    
    if (validateTrimPoints(clampedInPoint, outPoint)) {
      setInPoint(clampedInPoint);
      setInPointInput(clampedInPoint.toFixed(3));
      setInPointError(false);
      onTrimChange(selectedClip.id, clampedInPoint, outPoint);
    } else {
      // Auto-correct to valid value (snap to frame)
      const validInPoint = snapToFrame(Math.max(0, outPoint - 0.033));
      setInPoint(validInPoint);
      setInPointInput(validInPoint.toFixed(3));
      setInPointError(false);
      onTrimChange(selectedClip.id, validInPoint, outPoint);
    }
  };

  const handleOutPointBlur = () => {
    if (!selectedClip) return;

    // Snap to frame boundary, then clamp to valid range
    const snappedOutPoint = snapToFrame(outPoint);
    const clampedOutPoint = clampValue(snappedOutPoint, 0, selectedClip.duration);
    
    if (validateTrimPoints(inPoint, clampedOutPoint)) {
      setOutPoint(clampedOutPoint);
      setOutPointInput(clampedOutPoint.toFixed(3));
      setOutPointError(false);
      onTrimChange(selectedClip.id, inPoint, clampedOutPoint);
    } else {
      // Auto-correct to valid value (snap to frame)
      const validOutPoint = snapToFrame(Math.min(selectedClip.duration, inPoint + 0.033));
      setOutPoint(validOutPoint);
      setOutPointInput(validOutPoint.toFixed(3));
      setOutPointError(false);
      onTrimChange(selectedClip.id, inPoint, validOutPoint);
    }
  };

  const handleResetTrim = () => {
    if (!selectedClip) return;

    const fullInPoint = 0;
    const fullOutPoint = selectedClip.duration;

    setInPoint(fullInPoint);
    setOutPoint(fullOutPoint);
    setInPointInput(fullInPoint.toFixed(3));
    setOutPointInput(fullOutPoint.toFixed(3));
    setInPointError(false);
    setOutPointError(false);

    onTrimChange(selectedClip.id, fullInPoint, fullOutPoint);
  };

  const activeDuration = selectedClip ? outPoint - inPoint : 0;
  const disabled = !selectedClip;

  // Handle Enter key to apply value (same as blur)
  const handleInPointKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleOutPointKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="trim-controls">
      <div className="trim-input-group">
        <label htmlFor="in-point">In Point (seconds)</label>
        <input
          id="in-point"
          type="number"
          className={`trim-input ${inPointError ? "invalid" : ""}`}
          value={inPointInput}
          onChange={handleInPointChange}
          onBlur={handleInPointBlur}
          onKeyDown={handleInPointKeyDown}
          disabled={disabled}
          step="0.033"
          min="0"
          max={selectedClip?.duration || 0}
        />
      </div>

      <button
        className="trim-button"
        onClick={handleSetInPoint}
        disabled={disabled}
        title="Set In Point at current playhead (I key)"
      >
        Set In Point (I)
      </button>

      <div className="trim-input-group">
        <label htmlFor="out-point">Out Point (seconds)</label>
        <input
          id="out-point"
          type="number"
          className={`trim-input ${outPointError ? "invalid" : ""}`}
          value={outPointInput}
          onChange={handleOutPointChange}
          onBlur={handleOutPointBlur}
          onKeyDown={handleOutPointKeyDown}
          disabled={disabled}
          step="0.033"
          min="0"
          max={selectedClip?.duration || 0}
        />
      </div>

      <button
        className="trim-button"
        onClick={handleSetOutPoint}
        disabled={disabled}
        title="Set Out Point at current playhead (O key)"
      >
        Set Out Point (O)
      </button>

      <div className="trim-range-display">
        {selectedClip ? (
          <>
            <div>Trim Range: {inPoint.toFixed(2)}s → {outPoint.toFixed(2)}s</div>
            <div>Active Duration: {activeDuration.toFixed(2)}s</div>
          </>
        ) : (
          <div>No clip selected</div>
        )}
      </div>

      <button
        className="trim-reset-button"
        onClick={handleResetTrim}
        disabled={disabled}
        title="Reset trim to full clip duration"
      >
        Reset Trim
      </button>

      <div className="keyboard-hints">
        <span>I: Set In</span>
        <span>O: Set Out</span>
      </div>
    </div>
  );
}

