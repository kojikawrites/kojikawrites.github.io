/**
 * Docker Model Runner LLM Provider
 *
 * Implements LLM operations using Docker Model Runner (Docker Desktop 4.40+/Compose 2.38+).
 * Uses OpenAI-compatible API format.
 *
 * Docker Model Runner automatically injects:
 *   - LLM_URL: The endpoint URL for the model
 *   - LLM_MODEL: The model identifier
 *
 * Documentation: https://docs.docker.com/model-runner/
 */

import type {
  LLMProvider,
  TextGenerationOptions,
  ImageAnalysisOptions,
  LLMConfig,
} from '../types';
import { LLMError } from '../types';
import { getEffectiveMaxTokens } from '../utils';

export class DockerProvider implements LLMProvider {
  private baseUrl: string;
  private textModel: string;
  private visionModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private timeout: number;
  private contextSize: number;

  constructor(config: LLMConfig) {
    // Docker Model Runner auto-injects LLM_URL
    // Fallback to localhost for local testing
    this.baseUrl = config.dockerUrl || 'http://localhost:11434';

    this.defaultMaxTokens = config.maxTokens;
    this.defaultTemperature = config.temperature;
    this.timeout = config.timeout;
    this.contextSize = config.contextSize;

    // Support both single-model and dual-model configurations
    if (config.dockerTextModel && config.dockerVisionModel) {
      // Dual-model mode: separate models for text and vision
      this.textModel = config.dockerTextModel;
      this.visionModel = config.dockerVisionModel;
    } else {
      // Single-model mode: one model for both (must support vision)
      // Model can come from LLM_MODEL (auto-injected) or LLM_DOCKER_MODEL (manual)
      // Keep 'ai/' prefix - Docker Model Runner needs it
      const model = config.dockerModel || 'ai/qwen3-vl:8B-UD-Q4_K_XL';
      this.textModel = model;
      this.visionModel = model;
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
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

    return this.chat(this.textModel, messages, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });
  }

  async analyzeImage(
    imageData: string,
    prompt: string,
    options?: ImageAnalysisOptions
  ): Promise<string> {
    // OpenAI-compatible vision API format
    // Supports base64 data URI format
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageData, // data:image/...;base64,... format
            },
          },
        ],
      },
    ];

    return this.chat(this.visionModel, messages, {
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
    // baseUrl might already include /v1/ or /engines/v1/ path
    const modelsUrl = this.baseUrl.includes('/v1/')
      ? `${this.baseUrl.replace(/\/$/, '')}/models`
      : `${this.baseUrl}/v1/models`;

    console.log(`[Docker Provider] Checking availability at: ${modelsUrl}`);

    try {
      const response = await fetch(modelsUrl, {
        signal: AbortSignal.timeout(5000),
      });
      console.log(`[Docker Provider] Models endpoint status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.warn(`[Docker Provider] Models endpoint failed:`, error);

      // Fallback: try direct chat endpoint with minimal request
      try {
        const chatUrl = this.baseUrl.includes('/v1/')
          ? `${this.baseUrl.replace(/\/$/, '')}/chat/completions`
          : `${this.baseUrl}/v1/chat/completions`;

        console.log(`[Docker Provider] Trying chat endpoint: ${chatUrl}`);

        const response = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.textModel,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(5000),
        });
        console.log(`[Docker Provider] Chat endpoint status: ${response.status}`);
        return response.ok || response.status === 400; // 400 might mean model exists but request invalid
      } catch (fallbackError) {
        console.error(`[Docker Provider] Both endpoints failed:`, fallbackError);
        return false;
      }
    }
  }

  /**
   * Internal: Call OpenAI-compatible chat API
   */
  private async chat(
    model: string,
    messages: any[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    // Get effective max tokens (respects context window)
    const requestedTokens = options?.maxTokens || this.defaultMaxTokens;
    const effectiveMaxTokens = getEffectiveMaxTokens(this.contextSize, requestedTokens);

    try {
      // baseUrl might already include /v1/ or /engines/v1/ path
      const chatUrl = this.baseUrl.includes('/v1/')
        ? `${this.baseUrl.replace(/\/$/, '')}/chat/completions`
        : `${this.baseUrl}/v1/chat/completions`;

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: effectiveMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Docker Model Runner API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('No content in Docker Model Runner response');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new LLMError(
          `Docker Model Runner request failed: ${error.message}`,
          'docker',
          error
        );
      }
      throw new LLMError('Docker Model Runner request failed: Unknown error', 'docker');
    }
  }
}