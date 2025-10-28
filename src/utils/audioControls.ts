import { Clip } from '../types';

export interface AudioHandlers {
  clips: Clip[];
  selectedClipId: string | null;
  pushState: (state: any) => void;
  addToast: (toast: any) => void;
  showSuccessToast: (message: string) => any;
  TOAST_MESSAGES: any;
}

export function handleVolumeChange(clipId: string, volume: number, handlers: AudioHandlers): void {
  const newClips = handlers.clips.map(clip => 
    clip.id === clipId 
      ? { ...clip, volume, muted: volume === 0 }
      : clip
  );
  
  handlers.pushState({
    clips: newClips,
    selectedClipId: handlers.selectedClipId,
  });
  
  handlers.addToast(handlers.showSuccessToast(handlers.TOAST_MESSAGES.VOLUME_CHANGED));
}

export function handleMuteToggle(clipId: string, muted: boolean, handlers: AudioHandlers): void {
  const newClips = handlers.clips.map(clip => 
    clip.id === clipId 
      ? { ...clip, muted }
      : clip
  );
  
  handlers.pushState({
    clips: newClips,
    selectedClipId: handlers.selectedClipId,
  });
  
  handlers.addToast(handlers.showSuccessToast(muted ? handlers.TOAST_MESSAGES.AUDIO_MUTED : handlers.TOAST_MESSAGES.AUDIO_UNMUTED));
}
