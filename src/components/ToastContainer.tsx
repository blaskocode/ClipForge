import React from 'react';
import { ToastComponent, Toast } from './Toast';

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
