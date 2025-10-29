import { Toast } from '../components/Toast';

export type { Toast };

export const createToast = (
  type: 'success' | 'error' | 'info',
  message: string,
  details?: string,
  duration?: number
): Toast => ({
  id: Math.random().toString(36).substr(2, 9),
  type,
  message,
  details,
  duration,
});

export const showSuccessToast = (
  message: string,
  duration?: number
): Toast => createToast('success', message, undefined, duration);

export const showErrorToast = (
  message: string,
  details?: string,
  duration?: number
): Toast => createToast('error', message, details, duration);

export const showInfoToast = (
  message: string,
  duration?: number
): Toast => createToast('info', message, undefined, duration);

// Common toast messages
export const TOAST_MESSAGES = {
  CLIPS_IMPORTED: (count: number) => `${count} clip${count === 1 ? '' : 's'} imported successfully`,
  EXPORT_SUCCESS: 'Export completed successfully!',
  EXPORT_ERROR: 'Export failed',
  PROJECT_SAVED: 'Project saved successfully',
  PROJECT_LOADED: 'Project loaded successfully',
  CLIP_DELETED: 'Clip deleted from timeline',
  CLIP_SPLIT: 'Clip split at playhead',
  TRIM_UPDATED: 'Trim points updated',
  NEW_PROJECT: 'New project created',
  UNDO: 'Action undone',
  REDO: 'Action redone',
  AUDIO_MUTED: 'Audio muted',
  AUDIO_UNMUTED: 'Audio unmuted',
  VOLUME_CHANGED: 'Volume adjusted',
  ZOOM_CHANGED: 'Timeline zoom updated',
  THUMBNAILS_EXTRACTED: 'Thumbnails extracted',
} as const;
