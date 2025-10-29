import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './../App.css';
import { Clip } from '../types';
import { formatFileSize } from '../utils/formatHelpers';

interface ClipThumbnailsProps {
  clip: Clip;
  thumbnailCount?: number;
}

export const ClipThumbnails: React.FC<ClipThumbnailsProps> = ({ 
  clip, 
  thumbnailCount = 5 
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clip && clip.path) {
      extractThumbnails();
    }
  }, [clip.path, thumbnailCount]);

  const extractThumbnails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Pass duration if available (especially for WebM recordings)
      const thumbnailDataUrls = await invoke<string[]>('extract_thumbnails', {
        filePath: clip.path,
        count: thumbnailCount,
        duration: clip.duration > 0 ? clip.duration : undefined,
      });
      
      // Even if we get an empty array, that's OK - it means extraction failed gracefully
      setThumbnails(thumbnailDataUrls);
    } catch (err) {
      // Only set error if the command itself failed, not if it returned an empty array
      console.error('Failed to extract thumbnails:', err);
      setError(err as string);
      setThumbnails([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="clip-thumbnails loading">
        <div className="thumbnail-placeholder">
          <div className="loading-spinner"></div>
          <span>Extracting thumbnails...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clip-thumbnails error">
        <div className="thumbnail-placeholder error">
          <span>⚠️</span>
          <span>Thumbnail extraction failed</span>
        </div>
      </div>
    );
  }

  if (thumbnails.length === 0) {
    return (
      <div className="clip-thumbnails empty">
        <div className="thumbnail-placeholder empty">
          <span>📹</span>
          <span>No thumbnails</span>
        </div>
      </div>
    );
  }

  return (
    <div className="clip-thumbnails">
      <div className="thumbnails-container">
        {thumbnails.map((thumbnail, index) => (
          <div key={index} className="thumbnail-item">
            <img
              src={thumbnail}
              alt={`Thumbnail ${index + 1}`}
              className="thumbnail-image"
              loading="lazy"
            />
            <div className="thumbnail-time">
              {((clip.duration / (thumbnailCount + 1)) * (index + 1)).toFixed(1)}s
            </div>
          </div>
        ))}
      </div>
      {clip.fileSize && (
        <div className="clip-metadata" style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
          File Size: {formatFileSize(clip.fileSize)} | Resolution: {clip.width}×{clip.height} | Duration: {clip.duration.toFixed(1)}s
        </div>
      )}
    </div>
  );
};
