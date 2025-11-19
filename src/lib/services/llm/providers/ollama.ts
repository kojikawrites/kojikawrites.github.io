/**
 * Ollama LLM Provider
 *
 * Implements LLM operations using local Ollama instance.
 * Supports both single-model and dual-model (text+vision) configurations.
 *
 * API Documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type {
  LLMProvider,
  TextGenerationOptions,
  ImageAnalysisOptions,
  LLMConfig,
} from '../types';
import { LLMError } from '../types';
import { getEffectiveMaxTokens } from '../utils';

interface ModelCapabilities {
  maxTokens: number;
  contextWindow: number;
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private textModel: string;
  private visionModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private timeout: number;
  private contextSize: number;
  private textModelCaps: ModelCapabilities | null = null;
  private visionModelCaps: ModelCapabilities | null = null;

  constructor(config: LLMConfig) {
    this.baseUrl = config.ollamaUrl || 'http://localhost:11434';
    console.log(`Ollama Provider URL: ${this.baseUrl}`);
    this.defaultMaxTokens = config.maxTokens;
    this.defaultTemperature = config.temperature;
    this.timeout = config.timeout;
    this.contextSize = config.contextSize;

    // Support both single-model and dual-model configurations
    if (config.ollamaTextModel && config.ollamaVisionModel) {
      // Dual-model mode: separate models for text and vision
      this.textModel = config.ollamaTextModel;
      this.visionModel = config.ollamaVisionModel;
    } else {
      // Single-model mode: one model for both (must support vision)
      const model = config.ollamaModel || 'llama3.2-vision:11b';
      this.textModel = model;
      this.visionModel = model;
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const model = this.textModel;
    const messages = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    return this.chat(model, messages, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });
  }

  async analyzeImage(
    imageData: string,
    prompt: string,
    options?: ImageAnalysisOptions
  ): Promise<string> {
    const model = this.visionModel;

    // Ollama expects base64 image data without the data URI prefix
    const base64Image = imageData.replace(/^data:image\/[^;]+;base64,/, '');

    const messages = [
      {
        role: 'user',
        content: prompt,
        images: [base64Image],
      },
    ];

    return this.chat(model, messages, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });
  }

  async editText(
    text: string,
    instruction: string,
    options?: TextGenerationOptions
  ): Promise<string> {
    const prompt = `${instruction}\n\nText to edit:\n${text}\n\nEdited text:`;
    return this.generateText(prompt, {
      ...options,
      systemPrompt: 'You are a helpful writing assistant. Edit the text according to the instruction. Return ONLY the edited text, no explanations.',
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        // Proactively fetch model capabilities
        await this.getModelCapabilities(this.textModel);
        if (this.textModel !== this.visionModel) {
          await this.getModelCapabilities(this.visionModel);
        }
      }
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get model capabilities (context window, max tokens)
   */
  private async getModelCapabilities(modelName: string): Promise<ModelCapabilities> {
    // Return cached if available
    if (modelName === this.textModel && this.textModelCaps) {
      return this.textModelCaps;
    }
    if (modelName === this.visionModel && this.visionModelCaps) {
      return this.visionModelCaps;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.status}`);
      }

      const data = await response.json();

      // Parse model info from modelfile or parameters
      // Ollama returns context window in num_ctx parameter
      const numCtx = data.modelfile?.match(/num_ctx\s+(\d+)/)?.[1] ||
                     data.parameters?.match(/num_ctx\s+(\d+)/)?.[1] ||
                     '2048';  // Default fallback

      const contextWindow = parseInt(numCtx, 10);

      // Max tokens should be less than context window (leave room for prompt)
      // Use 75% of context window as max output tokens
      const maxTokens = Math.floor(contextWindow * 0.75);

      const caps: ModelCapabilities = {
        contextWindow,
        maxTokens,
      };

      // Cache the capabilities
      if (modelName === this.textModel) {
        this.textModelCaps = caps;
      }
      if (modelName === this.visionModel) {
        this.visionModelCaps = caps;
      }

      console.log(`Model ${modelName} capabilities:`, caps);
      return caps;
    } catch (error) {
      console.warn(`Failed to get capabilities for ${modelName}, using defaults:`, error);
      // Return safe defaults
      return {
        contextWindow: 2048,
        maxTokens: 1536,
      };
    }
  }

  /**
   * Get effective max tokens for a model (min of config and model capability)
   */
  private async getEffectiveMaxTokens(modelName: string, requestedTokens?: number): Promise<number> {
    const caps = await this.getModelCapabilities(modelName);
    const requestedMax = requestedTokens || this.defaultMaxTokens;

    // Use the shared utility with the actual model's context window
    // (or fall back to configured contextSize if model info unavailable)
    const contextWindow = caps.contextWindow || this.contextSize;
    return getEffectiveMaxTokens(contextWindow, requestedMax);
  }

  /**
   * Internal: Call Ollama chat API
   */
  private async chat(
    model: string,
    messages: any[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    // Get effective max tokens (respects model capabilities)
    const effectiveMaxTokens = await this.getEffectiveMaxTokens(model, options?.maxTokens);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          options: {
            num_predict: effectiveMaxTokens,
            temperature: options?.temperature ?? this.defaultTemperature,
          },
          stream: false, // Get complete response at once
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (!data.message?.content) {
        throw new Error('No content in Ollama response');
      }

      return data.message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new LLMError(
          `Ollama request failed: ${error.message}`,
          'ollama',
          error
        );
      }
      throw new LLMError('Ollama request failed: Unknown error', 'ollama');
    }
  }

  /**
   * Pull a model from Ollama library (for setup/management)
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      // Note: In production, you might want to stream this response
      // to show download progress
    } catch (error) {
      throw new LLMError(
        `Failed to pull model ${modelName}`,
        'ollama',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      throw new LLMError(
        'Failed to list models',
        'ollama',
        error instanceof Error ? error : undefined
      );
    }
  }
}
