/**
 * LLM Service Type Definitions
 *
 * Provides a unified interface for multiple LLM providers (Docker Model Runner, Ollama, OpenAI, Claude)
 */

export type LLMProviderType = 'docker' | 'ollama' | 'openai' | 'claude';

export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
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
  contextSize: number;  // Model's context window size (total tokens: prompt + response)

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