/**
 * OpenAI LLM Provider
 *
 * Implements LLM operations using the OpenAI API.
 * Supports both text generation and vision (image analysis).
 *
 * API Documentation: https://platform.openai.com/docs/api-reference
 *
 * Environment Variables:
 *   LLM_OPENAI_API_KEY - Your OpenAI API key
 *   LLM_OPENAI_TEXT_MODEL - Text model (default: gpt-4o)
 *   LLM_OPENAI_VISION_MODEL - Vision model (default: gpt-4o)
 */

import type {
  LLMProvider,
  TextGenerationOptions,
  ImageAnalysisOptions,
  LLMConfig,
} from '../types';
import { LLMError } from '../types';
import { buildJsonResponseFormat } from '../utils';

// Known max output tokens per model (as of 2025)
// See: https://platform.openai.com/docs/models
const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  // GPT-4o series
  'gpt-4o': 16384,
  'gpt-4o-2024-11-20': 16384,
  'gpt-4o-2024-08-06': 16384,
  'gpt-4o-2024-05-13': 4096,
  'gpt-4o-mini': 16384,
  'gpt-4o-mini-2024-07-18': 16384,
  // GPT-4 Turbo
  'gpt-4-turbo': 4096,
  'gpt-4-turbo-2024-04-09': 4096,
  'gpt-4-turbo-preview': 4096,
  'gpt-4-0125-preview': 4096,
  'gpt-4-1106-preview': 4096,
  // GPT-4 Vision
  'gpt-4-vision-preview': 4096,
  'gpt-4-1106-vision-preview': 4096,
  // GPT-4
  'gpt-4': 8192,
  'gpt-4-0613': 8192,
  'gpt-4-32k': 8192,
  // GPT-3.5
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-0125': 4096,
  'gpt-3.5-turbo-1106': 4096,
  'gpt-3.5-turbo-16k': 4096,
  // o1 series (reasoning models)
  'o1': 100000,
  'o1-2024-12-17': 100000,
  'o1-preview': 32768,
  'o1-preview-2024-09-12': 32768,
  'o1-mini': 65536,
  'o1-mini-2024-09-12': 65536,
};

// Default fallback if model not found
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

// OpenAI API types
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get the maximum output tokens for a model
 */
function getModelMaxTokens(model: string): number {
  // Direct lookup
  if (MODEL_MAX_OUTPUT_TOKENS[model]) {
    return MODEL_MAX_OUTPUT_TOKENS[model];
  }

  // Try prefix matching for versioned models
  for (const [key, value] of Object.entries(MODEL_MAX_OUTPUT_TOKENS)) {
    if (model.startsWith(key)) {
      return value;
    }
  }

  console.warn(`[OpenAI] Unknown model ${model}, using default max tokens: ${DEFAULT_MAX_OUTPUT_TOKENS}`);
  return DEFAULT_MAX_OUTPUT_TOKENS;
}

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private textModel: string;
  private visionModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private timeout: number;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: LLMConfig) {
    if (!config.openaiApiKey) {
      throw new LLMError(
        'OpenAI API key not configured. Set LLM_OPENAI_API_KEY environment variable.',
        'openai'
      );
    }

    this.apiKey = config.openaiApiKey;
    this.textModel = config.openaiTextModel || 'gpt-4o';
    this.visionModel = config.openaiVisionModel || 'gpt-4o';
    this.defaultMaxTokens = config.maxTokens || 4096;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.timeout = config.timeout || 120000;

    console.log(`[OpenAI] Initialized with text model: ${this.textModel}, vision model: ${this.visionModel}`);
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const messages: ChatMessage[] = [];

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
      timeout: options?.timeout,
      format: (options as any)?.format,
    });
  }

  async analyzeImage(
    imageData: string,
    prompt: string,
    options?: ImageAnalysisOptions
  ): Promise<string> {
    // OpenAI accepts both base64 data URIs and URLs
    // If it's already a data URI, use it directly
    // If it's raw base64, add the data URI prefix
    let imageUrl = imageData;
    if (!imageData.startsWith('data:') && !imageData.startsWith('http')) {
      // Assume JPEG if no prefix - caller should provide proper data URI
      imageUrl = `data:image/jpeg;base64,${imageData}`;
    }

    const content: ContentPart[] = [
      {
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: options?.detail || 'auto',
        },
      },
      {
        type: 'text',
        text: prompt,
      },
    ];

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content,
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
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful writing assistant. Edit the text according to the instruction. Return ONLY the edited text, no explanations or additional commentary.',
      },
      {
        role: 'user',
        content: `${instruction}\n\nText to edit:\n${text}`,
      },
    ];

    return this.chat(this.textModel, messages, {
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      timeout: options?.timeout,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple API key validation - list models endpoint
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`[OpenAI] API check failed: ${response.status}`);
        return false;
      }

      console.log('[OpenAI] API key validated successfully');
      return true;
    } catch (error) {
      console.warn('[OpenAI] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Internal: Call OpenAI Chat Completions API
   */
  private async chat(
    model: string,
    messages: ChatMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
      format?: any;
    }
  ): Promise<string> {
    const requestTimeout = options?.timeout ?? this.timeout;

    try {
      // Clamp max_tokens to model's limit
      const requestedMaxTokens = options?.maxTokens ?? this.defaultMaxTokens;
      const modelMaxTokens = getModelMaxTokens(model);
      const effectiveMaxTokens = Math.min(requestedMaxTokens, modelMaxTokens);

      if (requestedMaxTokens > modelMaxTokens) {
        console.log(`[OpenAI] Clamping max_tokens from ${requestedMaxTokens} to ${modelMaxTokens} (model limit for ${model})`);
      }

      const requestBody: any = {
        model,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
      };

      // Add response format for JSON structured output
      if (options?.format) {
        requestBody.response_format = buildJsonResponseFormat(options.format);
      }

      console.log(`[OpenAI] Sending request to ${model}...`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(requestTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `OpenAI API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const data: ChatCompletionResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from OpenAI');
      }

      const content = data.choices[0].message.content;

      if (data.usage) {
        console.log(`[OpenAI] Response received - tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
      }

      if (data.choices[0].finish_reason === 'length') {
        console.warn('[OpenAI] Response truncated due to max_tokens limit');
      }

      return content;
    } catch (error) {
      if (error instanceof Error) {
        // Handle timeout specifically
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          throw new LLMError(
            `OpenAI request timed out after ${requestTimeout}ms`,
            'openai',
            error
          );
        }

        throw new LLMError(
          `OpenAI request failed: ${error.message}`,
          'openai',
          error
        );
      }
      throw new LLMError('OpenAI request failed: Unknown error', 'openai');
    }
  }
}