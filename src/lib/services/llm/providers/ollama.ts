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
  private textContextSize: number;
  private visionContextSize: number;
  private textModelCaps: ModelCapabilities | null = null;
  private visionModelCaps: ModelCapabilities | null = null;

  constructor(config: LLMConfig) {
    this.baseUrl = config.ollamaUrl || 'http://localhost:11434';
    console.log(`Ollama Provider URL: ${this.baseUrl}`);
    this.defaultMaxTokens = config.maxTokens;
    this.defaultTemperature = config.temperature;
    this.timeout = config.timeout;
    this.textContextSize = config.textContextSize;
    this.visionContextSize = config.visionContextSize;

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
      format: (options as any)?.format, // Pass through format option
      timeout: options?.timeout, // Pass through timeout option
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
      format: (options as any)?.format, // Pass through format option
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

      // Parse context window from model_info (preferred) or modelfile/parameters
      // model_info contains structured data like "qwen3vlmoe.context_length": 262144
      let contextWindow = 0;

      // First, check model_info for context_length (most reliable)
      if (data.model_info) {
        // Find any key ending in .context_length
        for (const key of Object.keys(data.model_info)) {
          if (key.endsWith('.context_length')) {
            contextWindow = data.model_info[key];
            console.log(`[Ollama] Found context_length in model_info[${key}]: ${contextWindow}`);
            break;
          }
        }
      }

      // Fallback: check num_ctx in modelfile or parameters
      if (!contextWindow) {
        const numCtx = data.modelfile?.match(/num_ctx\s+(\d+)/)?.[1] ||
                       data.parameters?.match(/num_ctx\s+(\d+)/)?.[1];
        if (numCtx) {
          contextWindow = parseInt(numCtx, 10);
          console.log(`[Ollama] Found num_ctx in modelfile/parameters: ${contextWindow}`);
        }
      }

      // Final fallback - use a reasonable default
      if (!contextWindow) {
        contextWindow = 32768; // Most modern models support at least 32k
        console.log(`[Ollama] No context length found, using default: ${contextWindow}`);
      }

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

    // Determine which fallback context size to use
    const isVisionModel = modelName === this.visionModel;
    const fallbackContextSize = isVisionModel ? this.visionContextSize : this.textContextSize;

    // Use model's actual context window if available
    // Fall back to configured context size only if model info unavailable
    const contextWindow = caps.contextWindow || fallbackContextSize;

    // If no context window limit (0 or undefined), just return requested
    // This allows models to use their native maximum
    if (!contextWindow || contextWindow === 0) {
      return requestedMax;
    }

    return getEffectiveMaxTokens(contextWindow, requestedMax);
  }

  /**
   * Internal: Call Ollama chat API
   */
  private async chat(
    model: string,
    messages: any[],
    options?: { maxTokens?: number; temperature?: number; format?: any; timeout?: number }
  ): Promise<string> {
    // Get effective max tokens (respects model capabilities)
    const effectiveMaxTokens = await this.getEffectiveMaxTokens(model, options?.maxTokens);

    try {
      const requestBody: any = {
        model,
        messages,
        options: {
          num_predict: effectiveMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
        },
        stream: false, // Get complete response at once
      };

      // Add format parameter if provided (JSON schema for structured output)
      // Ollama supports passing a JSON schema directly as the format
      if (options?.format) {
        // If format is a JSON schema object, use it directly
        // Ollama will enforce the structure
        requestBody.format = options.format;
      }

      // Use per-request timeout if provided, otherwise fall back to default
      const requestTimeout = options?.timeout ?? this.timeout;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(requestTimeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      // Log raw response text before parsing
      const rawText = await response.text();
      console.log('[Ollama] Raw response:', rawText);

      const data = JSON.parse(rawText);

      // Handle thinking models (like qwen3-vl) which may return content in 'thinking' field
      // or have empty 'content' while still generating valid output
      const content = data.message?.content || '';
      const thinking = data.message?.thinking || '';

      console.log('[Ollama] Parsed response - content:', content ? `"${content.substring(0, 100)}..."` : '(empty)');
      console.log('[Ollama] Parsed response - thinking:', thinking ? `"${thinking.substring(0, 100)}..."` : '(empty)');
      console.log('[Ollama] Parsed response - done_reason:', data.done_reason);

      // If we have content, use it directly
      if (content) {
        return content;
      }

      // For thinking models: if content is empty but we have thinking
      if (thinking) {
        // If ran out of tokens during thinking, warn but still try to use thinking
        if (data.done_reason === 'length') {
          console.warn('[Ollama] Model ran out of tokens during thinking phase (done_reason=length)');
        }
        // Return the thinking content - this IS the response for thinking models
        console.log('[Ollama] Using thinking content as response');
        return thinking;
      }

      throw new Error('No content in Ollama response');
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
