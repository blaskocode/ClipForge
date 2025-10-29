// API Key Management for OpenAI
// Simple localStorage-based storage for MVP

const API_KEY_STORAGE_KEY = 'openai_api_key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function validateApiKeyFormat(key: string): boolean {
  // OpenAI API keys start with "sk-"
  return key.trim().startsWith('sk-');
}

