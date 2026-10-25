export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Ask for a JSON object back (providers that support it enforce it; others are prompted). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly id: string;
  chat(req: AIRequest): Promise<string>;
  /** Text to speech; returns audio bytes. Optional: not every provider has a voice. */
  speak?(text: string, opts: { voice?: string; signal?: AbortSignal }): Promise<{ audio: ArrayBuffer; mime: string }>;
  /** Speech to text. */
  transcribe?(audio: Blob, opts: { lang?: string; signal?: AbortSignal }): Promise<string>;
}

export type ProviderName = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'mock';

export interface ProviderConfig {
  provider: ProviderName;
  apiKey?: string;
  model?: string;
  /** Override the API base, e.g. an Azure/OpenAI-compatible gateway or a remote Ollama. */
  baseUrl?: string;
  /** Model for speech, when the provider has one. */
  ttsModel?: string;
  ttsVoice?: string;
  sttModel?: string;
}

export class AIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AIError';
  }
}
