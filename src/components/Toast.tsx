import React, { useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const handleCopyError = () => {
    if (toast.details) {
      navigator.clipboard.writeText(toast.details);
    }
  };

  const getToastClass = () => {
    switch (toast.type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'info':
        return 'toast-info';
      default:
        return 'toast-info';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`toast ${getToastClass()}`}>
      <div className="toast-content">
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-message">
          <div className="toast-text">{toast.message}</div>
          {toast.details && (
            <div className="toast-details">
              <details>
                <summary>Error Details</summary>
                <pre>{toast.details}</pre>
                <button 
                  className="copy-error-button"
                  onClick={handleCopyError}
                  title="Copy error details to clipboard"
                >
                  Copy Error Details
                </button>
              </details>
            </div>
          )}
        </div>
        <button 
          className="toast-close"
          onClick={() => onClose(toast.id)}
          title="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};
