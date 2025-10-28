import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ImportButtonProps {
  onImport: (filePath: string) => void;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClick = async () => {
    setIsImporting(true);
    try {
      const filePath = await invoke<string>("select_video_file");
      if (filePath) {
        onImport(filePath);
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert(`Import failed: ${error}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <button 
      onClick={handleImportClick}
      disabled={isImporting}
      className="import-button"
    >
      {isImporting ? "Importing..." : "Import Video"}
    </button>
  );
}
