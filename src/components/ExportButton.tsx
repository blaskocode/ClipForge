import { Clip } from '../types';

interface ExportButtonProps {
  clips: Clip[];
  onExport: () => Promise<void>;
  isExporting: boolean;
}

export function ExportButton({ clips, onExport, isExporting }: ExportButtonProps) {
  const hasClips = clips.length > 0;
  const isDisabled = !hasClips || isExporting;
  
  const getButtonText = () => {
    if (isExporting) {
      if (clips.length > 2) {
        return 'Exporting... (This may take a while)';
      }
      return 'Exporting...';
    }
    return 'Export Video';
  };

  return (
    <button
      className="export-button"
      onClick={onExport}
      disabled={isDisabled}
      title={!hasClips ? 'Import clips first' : 'Export video with trim points'}
    >
      {isExporting && (
        <div className="export-spinner" />
      )}
      <span>{getButtonText()}</span>
    </button>
  );
}

