/**
 * LLM Service Type Definitions
 *
 * Provides a unified interface for multiple LLM providers (Docker Model Runner, Ollama, OpenAI, Claude)
 */

// Provider types:
// - 'docker': Docker Model Runner (Docker Desktop 4.40+)
// - 'ollama': External Ollama (you manage it - host machine, remote server, etc.)
// - 'ollama-docker': Containerized Ollama (we build and manage the container)
// - 'openai': OpenAI API (future)
// - 'claude': Claude API (future)
export type LLMProviderType = 'docker' | 'ollama' | 'ollama-docker' | 'openai' | 'claude';

export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  timeout?: number; // Request timeout in milliseconds (overrides default)
}

export interface ImageAnalysisOptions {
  maxTokens?: number;
  temperature?: number;
  detail?: 'low' | 'high' | 'auto'; // Image detail level
}

/**
 * Unified LLM Provider Interface
 * All provider implementations must implement this interface
 */
export interface LLMProvider {
  /**
   * Generate or edit text based on a prompt
   * @param prompt - The input prompt or text to process
   * @param options - Generation options
   * @returns Generated or edited text
   */
  generateText(prompt: string, options?: TextGenerationOptions): Promise<string>;

  /**
   * Analyze an image and generate a description (e.g., for alt text)
   * @param imageData - Base64 encoded image data or image URL
   * @param prompt - What to describe about the image
   * @param options - Analysis options
   * @returns Description of the image
   */
  analyzeImage(imageData: string, prompt: string, options?: ImageAnalysisOptions): Promise<string>;

  /**
   * Edit existing text according to instructions
   * @param text - The text to edit
   * @param instruction - How to modify the text
   * @param options - Generation options (maxTokens, temperature, systemPrompt)
   * @returns Edited text
   */
  editText(text: string, instruction: string, options?: TextGenerationOptions): Promise<string>;

  /**
   * Check if the provider is available and configured
   * @returns true if provider can be used
   */
  isAvailable(): Promise<boolean>;
}

export interface LLMConfig {
  provider: LLMProviderType;
  maxTokens: number;
  temperature: number;
  timeout: number;
  textContextSize: number;    // Text model's context window (0 = use model's native max)
  visionContextSize: number;  // Vision model's context window (0 = use model's native max)

  // Docker Model Runner-specific
  dockerUrl?: string;
  dockerModel?: string;
  dockerTextModel?: string;
  dockerVisionModel?: string;

  // Ollama-specific
  ollamaUrl?: string;
  ollamaModel?: string;
  ollamaTextModel?: string;
  ollamaVisionModel?: string;

  // OpenAI-specific (future)
  openaiApiKey?: string;
  openaiTextModel?: string;
  openaiVisionModel?: string;

  // Claude/Anthropic-specific (future)
  anthropicApiKey?: string;
  anthropicTextModel?: string;
  anthropicVisionModel?: string;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public provider: LLMProviderType,
    public cause?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}