import { useState } from 'react';
import { Clip, FillerWord } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { getApiKey, hasApiKey } from '../utils/apiKeyManager';
import '../styles/filler-words-panel.css';

interface FillerWordsPanelProps {
  selectedClip: Clip | null;
  onSeek: (time: number) => void;
  onDetect: (clipId: string, fillerWords: FillerWord[]) => void;
  onApiKeyRequired: () => void;
}

export function FillerWordsPanel({
  selectedClip,
  onSeek,
  onDetect,
  onApiKeyRequired,
}: FillerWordsPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetect = async () => {
    if (!selectedClip) return;

    // Check for API key
    if (!hasApiKey()) {
      onApiKeyRequired();
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      onApiKeyRequired();
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Update clip status to processing
      const inPoint = selectedClip.inPoint || 0;
      const outPoint = selectedClip.outPoint || selectedClip.duration;

      const fillerWords = await invoke<FillerWord[]>('detect_filler_words', {
        filePath: selectedClip.path,
        apiKey: apiKey,
        inPoint: inPoint > 0 ? inPoint : undefined,
        outPoint: outPoint < selectedClip.duration ? outPoint : undefined,
      });

      // Timestamps from Whisper are relative to the extracted audio segment
      // If we trimmed the audio (inPoint/outPoint), the timestamps are already relative to 0
      // But we need to adjust them to be relative to the full clip timeline
      const adjustedWords = fillerWords.map(word => ({
        ...word,
        startTime: word.startTime + inPoint,
        endTime: word.endTime + inPoint,
      }));

      onDetect(selectedClip.id, adjustedWords);
    } catch (err) {
      console.error('Filler word detection error:', err);
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWordClick = (startTime: number) => {
    onSeek(startTime);
  };

  if (!selectedClip) {
    return (
      <div className="filler-words-panel">
        <div className="filler-words-empty">
          Select a clip to detect filler words
        </div>
      </div>
    );
  }

  const hasFillerWords = selectedClip.fillerWords && selectedClip.fillerWords.length > 0;
  const isComplete = selectedClip.fillerDetectionStatus === 'complete';

  return (
    <div className="filler-words-panel">
      <div className="filler-words-header">
        <h3>Filler Words</h3>
        {!isComplete && (
          <button
            className="detect-button"
            onClick={handleDetect}
            disabled={isProcessing}
            title="Detect filler words in this clip"
          >
            {isProcessing ? 'Analyzing...' : 'Detect'}
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="filler-words-processing">
          <div className="loading-spinner" />
          <span>Analyzing audio with AI...</span>
          <span className="processing-note">This may take a moment</span>
        </div>
      )}

      {error && (
        <div className="filler-words-error">
          <span className="error-icon">⚠️</span>
          <div className="error-text">
            <strong>Detection Failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {isComplete && hasFillerWords && (
        <div className="filler-words-results">
          <div className="filler-words-count">
            {selectedClip.fillerWords!.length} filler word{selectedClip.fillerWords!.length !== 1 ? 's' : ''} detected
          </div>
          <div className="filler-words-list">
            {selectedClip.fillerWords!.map((word, index) => (
              <div
                key={index}
                className="filler-word-item"
                onClick={() => handleWordClick(word.startTime)}
                title={`Click to seek to ${word.startTime.toFixed(2)}s`}
              >
                <span className="filler-word-text">{word.word}</span>
                <span className="filler-word-time">
                  {word.startTime.toFixed(2)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isComplete && !hasFillerWords && (
        <div className="filler-words-success">
          <span className="success-icon">✓</span>
          <span>No filler words detected</span>
        </div>
      )}

      {!isProcessing && !isComplete && !error && (
        <div className="filler-words-idle">
          Click "Detect" to analyze this clip for filler words
        </div>
      )}
    </div>
  );
}

