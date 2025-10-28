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
  onTrimChange: (clipId: string, inPoint: number, outPoint: number) => void;
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
}

export function TrimControls({ selectedClip, onTrimChange, onSetInPoint, onSetOutPoint }: TrimControlsProps) {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(0);
  const [inPointInput, setInPointInput] = useState("0.000");
  const [outPointInput, setOutPointInput] = useState("0.000");
  const [inPointError, setInPointError] = useState(false);
  const [outPointError, setOutPointError] = useState(false);

  // Sync local state with selected clip
  useEffect(() => {
    if (selectedClip) {
      setInPoint(selectedClip.inPoint || 0);
      setOutPoint(selectedClip.outPoint || selectedClip.duration);
      setInPointInput((selectedClip.inPoint || 0).toFixed(3));
      setOutPointInput((selectedClip.outPoint || selectedClip.duration).toFixed(3));
      setInPointError(false);
      setOutPointError(false);
    }
  }, [selectedClip]);

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
      <div className="trim-controls-header">
        <h3>Trim Controls</h3>
      </div>
      
      <div className="trim-controls-content">
        {/* In Point Section */}
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
          onClick={onSetInPoint}
          disabled={disabled}
          title="Set In Point at current playhead (I key)"
        >
          Set In Point (I)
        </button>

        {/* Out Point Section */}
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
          onClick={onSetOutPoint}
          disabled={disabled}
          title="Set Out Point at current playhead (O key)"
        >
          Set Out Point (O)
        </button>

        {/* Range Display */}
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

        {/* Reset Button */}
        <button
          className="trim-reset-button"
          onClick={handleResetTrim}
          disabled={disabled}
          title="Reset trim to full clip duration"
        >
          Reset Trim
        </button>

        {/* Keyboard Hints */}
        <div className="keyboard-hints">
          <span>I: Set In</span>
          <span>O: Set Out</span>
        </div>
      </div>
    </div>
  );
}

