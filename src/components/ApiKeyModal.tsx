import { useState, useEffect } from 'react';
import { validateApiKeyFormat } from '../utils/apiKeyManager';
import '../styles/api-key-modal.css';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setError('API key is required');
      return;
    }

    if (!validateApiKeyFormat(trimmedKey)) {
      setError('Invalid API key format. OpenAI API keys start with "sk-"');
      return;
    }

    onSave(trimmedKey);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="api-key-overlay" onClick={onClose}>
      <div className="api-key-modal" onClick={(e) => e.stopPropagation()}>
        <div className="api-key-header">
          <h2>OpenAI API Key Required</h2>
          <button className="close-button" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>
        
        <div className="api-key-content">
          <p>
            Filler word detection uses OpenAI's Whisper API. 
            Please enter your API key to continue.
          </p>
          
          <div className="api-key-input-group">
            <label htmlFor="api-key-input">API Key</label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="sk-..."
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="api-key-info">
            <p>Your API key is stored locally and only used for transcription requests.</p>
            <p>
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Get your API key from OpenAI →
              </a>
            </p>
          </div>
        </div>

        <div className="api-key-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

