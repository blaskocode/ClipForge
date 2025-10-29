import React from 'react';
import { Clip } from '../types';
import { ClipThumbnails } from './ClipThumbnails';
import { formatFileSize } from '../utils/formatHelpers';
import './../styles/media-library.css';

interface MediaLibraryProps {
  libraryClips: Clip[];
  onAddToTimeline: (clip: Clip, track: 'main' | 'pip') => void;
  onDelete: (clipId: string) => void;
  onSelect: (clip: Clip) => void; // Preview in video player
}

export function MediaLibrary({
  libraryClips,
  onAddToTimeline,
  onDelete,
  onSelect,
}: MediaLibraryProps) {
  const handleDragStart = (e: React.DragEvent, clip: Clip) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      source: 'library',
      clipId: clip.id,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDelete = (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    if (confirm('Remove this clip from library?')) {
      onDelete(clipId);
    }
  };

  if (libraryClips.length === 0) {
    return (
      <div className="media-library">
        <div className="media-library-header">
          <h2>Media Library</h2>
        </div>
        <div className="media-library-empty">
          <p>No clips in library</p>
          <p className="empty-hint">Import videos to add them to your library</p>
        </div>
      </div>
    );
  }

  return (
    <div className="media-library">
      <div className="media-library-header">
        <h2>Media Library</h2>
        <span className="clip-count">{libraryClips.length} clip{libraryClips.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="media-library-grid">
        {libraryClips.map((clip) => (
          <div
            key={clip.id}
            className="library-clip-card"
            draggable
            onDragStart={(e) => handleDragStart(e, clip)}
            onClick={() => onSelect(clip)}
          >
            <div className="clip-thumbnail-wrapper">
              <ClipThumbnails clip={clip} thumbnailCount={3} />
            </div>
            <div className="clip-info">
              <div className="clip-filename" title={clip.filename}>
                {clip.filename}
              </div>
              <div className="clip-metadata">
                <span>{clip.duration.toFixed(1)}s</span>
                <span>{clip.width}×{clip.height}</span>
                {clip.fileSize && <span>{formatFileSize(clip.fileSize)}</span>}
                <span>{clip.codec.toUpperCase()}</span>
              </div>
            </div>
            <div className="clip-actions">
              <button
                className="add-to-main-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTimeline(clip, 'main');
                }}
                title="Add to Main Track"
              >
                Add to Main
              </button>
              <button
                className="add-to-pip-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTimeline(clip, 'pip');
                }}
                title="Add to PiP Track"
              >
                Add to PiP
              </button>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, clip.id)}
                title="Remove from Library"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

