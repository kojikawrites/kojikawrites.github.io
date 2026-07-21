/**
 * Claude/Anthropic LLM Provider
 *
 * Implements LLM operations using the Anthropic Claude API.
 * Supports both text generation and vision (image analysis).
 *
 * API Documentation: https://docs.anthropic.com/en/api/getting-started
 *
 * Environment Variables:
 *   LLM_ANTHROPIC_API_KEY - Your Anthropic API key
 *   LLM_ANTHROPIC_TEXT_MODEL - Text model (default: claude-sonnet-4-20250514)
 *   LLM_ANTHROPIC_VISION_MODEL - Vision model (default: claude-sonnet-4-20250514)
 */

import type {
  LLMProvider,
  TextGenerationOptions,
  ImageAnalysisOptions,
  LLMConfig,
} from '../types';
import { LLMError } from '../types';

// Known max output tokens per model (as of 2025)
// See: https://docs.anthropic.com/claude/docs/models-overview
const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  // Claude 4 series
  'claude-sonnet-4-20250514': 16384,
  'claude-4-sonnet': 16384,
  // Claude 3.7 series (with extended thinking support)
  'claude-3-7-sonnet-20250219': 16384, // Can be 128k with beta header
  'claude-3-7-sonnet': 16384,
  // Claude 3.5 series
  'claude-3-5-sonnet-20241022': 8192,
  'claude-3-5-sonnet-20240620': 8192,
  'claude-3-5-sonnet': 8192,
  'claude-3-5-haiku-20241022': 8192,
  'claude-3-5-haiku': 8192,
  // Claude 3 series
  'claude-3-opus-20240229': 4096,
  'claude-3-opus': 4096,
  'claude-3-sonnet-20240229': 4096,
  'claude-3-sonnet': 4096,
  'claude-3-haiku-20240307': 4096,
  'claude-3-haiku': 4096,
  // Claude 2 series (legacy)
  'claude-2.1': 4096,
  'claude-2.0': 4096,
  'claude-instant-1.2': 4096,
};

// Default fallback if model not found
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

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

  console.warn(`[Claude] Unknown model ${model}, using default max tokens: ${DEFAULT_MAX_OUTPUT_TOKENS}`);
  return DEFAULT_MAX_OUTPUT_TOKENS;
}

// Anthropic API types
interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data: string;
  };
}

type ContentBlock = TextContent | ImageContent;

interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface MessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider implements LLMProvider {
  private apiKey: string;
  private textModel: string;
  private visionModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private timeout: number;
  private baseUrl = 'https://api.anthropic.com/v1';
  private apiVersion = '2023-06-01';

  constructor(config: LLMConfig) {
    if (!config.anthropicApiKey) {
      throw new LLMError(
        'Anthropic API key not configured. Set LLM_ANTHROPIC_API_KEY environment variable.',
        'claude'
      );
    }

    this.apiKey = config.anthropicApiKey;
    this.textModel = config.anthropicTextModel || 'claude-sonnet-4-20250514';
    this.visionModel = config.anthropicVisionModel || 'claude-sonnet-4-20250514';
    this.defaultMaxTokens = config.maxTokens || 4096;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.timeout = config.timeout || 120000;

    console.log(`[Claude] Initialized with text model: ${this.textModel}, vision model: ${this.visionModel}`);
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const messages: Message[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    return this.chat(this.textModel, messages, {
      systemPrompt: options?.systemPrompt,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      timeout: options?.timeout,
    });
  }

  async analyzeImage(
    imageData: string,
    prompt: string,
    options?: ImageAnalysisOptions
  ): Promise<string> {
    // Parse the image data URI to extract media type and base64 data
    const { mediaType, base64Data } = this.parseImageData(imageData);

    const content: ContentBlock[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: prompt,
      },
    ];

    const messages: Message[] = [
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
    const messages: Message[] = [
      {
        role: 'user',
        content: `${instruction}\n\nText to edit:\n${text}`,
      },
    ];

    return this.chat(this.textModel, messages, {
      systemPrompt: 'You are a helpful writing assistant. Edit the text according to the instruction. Return ONLY the edited text, no explanations or additional commentary.',
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      timeout: options?.timeout,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal API call to verify the key works
      // Use a simple message that should complete quickly
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: this.textModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Claude] API check failed: ${response.status} - ${errorText}`);
        return false;
      }

      console.log('[Claude] API key validated successfully');
      return true;
    } catch (error) {
      console.warn('[Claude] Availability check failed:', error);
      return false;
    }
  }

  /**
   * Parse image data URI to extract media type and base64 data
   */
  private parseImageData(imageData: string): {
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    base64Data: string;
  } {
    // If it's a data URI, parse it
    if (imageData.startsWith('data:')) {
      const match = imageData.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        return {
          mediaType: mimeType,
          base64Data: match[2],
        };
      }
    }

    // If it's raw base64, assume JPEG
    return {
      mediaType: 'image/jpeg',
      base64Data: imageData,
    };
  }

  /**
   * Internal: Call Anthropic Messages API
   */
  private async chat(
    model: string,
    messages: Message[],
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
    }
  ): Promise<string> {
    const requestTimeout = options?.timeout ?? this.timeout;

    try {
      // Clamp max_tokens to model's limit
      const requestedMaxTokens = options?.maxTokens ?? this.defaultMaxTokens;
      const modelMaxTokens = getModelMaxTokens(model);
      const effectiveMaxTokens = Math.min(requestedMaxTokens, modelMaxTokens);

      if (requestedMaxTokens > modelMaxTokens) {
        console.log(`[Claude] Clamping max_tokens from ${requestedMaxTokens} to ${modelMaxTokens} (model limit for ${model})`);
      }

      const requestBody: any = {
        model,
        messages,
        max_tokens: effectiveMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
      };

      // Add system prompt if provided
      if (options?.systemPrompt) {
        requestBody.system = options.systemPrompt;
      }

      console.log(`[Claude] Sending request to ${model}...`);

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(requestTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Claude API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      const data: MessageResponse = await response.json();

      if (!data.content || data.content.length === 0) {
        throw new Error('No content returned from Claude');
      }

      // Extract text from response content blocks
      const textContent = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      console.log(`[Claude] Response received - tokens: ${data.usage.input_tokens + data.usage.output_tokens} (input: ${data.usage.input_tokens}, output: ${data.usage.output_tokens})`);

      if (data.stop_reason === 'max_tokens') {
        console.warn('[Claude] Response truncated due to max_tokens limit');
      }

      return textContent;
    } catch (error) {
      if (error instanceof Error) {
        // Handle timeout specifically
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          throw new LLMError(
            `Claude request timed out after ${requestTimeout}ms`,
            'claude',
            error
          );
        }

        throw new LLMError(
          `Claude request failed: ${error.message}`,
          'claude',
          error
        );
      }
      throw new LLMError('Claude request failed: Unknown error', 'claude');
    }
  }
}