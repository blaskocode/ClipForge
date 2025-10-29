import { Clip } from '../types';

interface ExportButtonProps {
  clips: Clip[];
  onExportClick: () => void; // Opens export settings modal
  isExporting: boolean;
}

export function ExportButton({ clips, onExportClick, isExporting }: ExportButtonProps) {
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
      onClick={onExportClick}
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

