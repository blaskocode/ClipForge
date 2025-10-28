import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ImportButtonProps {
  onImport: (filePath: string) => void;
}

export function ImportButton({ onImport }: ImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClick = async () => {
    console.log("Import button clicked");
    setIsImporting(true);
    try {
      const filePath = await invoke<string>("select_video_file");
      console.log("File path returned:", filePath);
      if (filePath) {
        console.log("Calling onImport with path:", filePath);
        onImport(filePath);
      } else {
        console.log("No file path returned, file selection cancelled");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't show error if user cancelled the dialog
      if (!errorMessage.includes("No file selected") && !errorMessage.includes("Dialog error")) {
        console.error("Import failed:", error);
        // Display error in UI instead
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = `Import failed: ${error}`;
        errorDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #d9534f; color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
        document.body.appendChild(errorDiv);
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 5000);
      }
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
