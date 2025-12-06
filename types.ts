export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string; // Base64 of generated image if any
  timestamp: number;
  isError?: boolean;
}

export type AppState = 'idle' | 'active' | 'processing';

export interface ImageState {
  original: string; // Base64
  current: string;  // Base64
  history: string[]; // Undo stack
}

export interface GeminiResponse {
  text?: string;
  image?: string;
}