/**
 * Claude/Anthropic LLM Provider (NOT YET IMPLEMENTED)
 *
 * TODO: Implement Claude integration using the official Anthropic API
 *
 * Required Dependencies:
 *   npm install @anthropic-ai/sdk
 *
 * API Documentation:
 *   https://docs.anthropic.com/en/api/getting-started
 *
 * Implementation Notes:
 *   - Claude Sonnet 3.5 supports both text and vision in one model
 *   - Images must be base64 encoded
 *   - System prompts are separate from messages
 *   - Supports streaming for better UX (optional)
 *
 * Example Implementation:
 *
 * import Anthropic from '@anthropic-ai/sdk';
 *
 * const anthropic = new Anthropic({
 *   apiKey: process.env.LLM_ANTHROPIC_API_KEY,
 * });
 *
 * // For text:
 * const message = await anthropic.messages.create({
 *   model: "claude-3-5-sonnet-20241022",
 *   max_tokens: maxTokens,
 *   temperature: temperature,
 *   messages: [{ role: "user", content: prompt }],
 * });
 *
 * // For images:
 * const message = await anthropic.messages.create({
 *   model: "claude-3-5-sonnet-20241022",
 *   max_tokens: maxTokens,
 *   messages: [{
 *     role: "user",
 *     content: [
 *       {
 *         type: "image",
 *         source: {
 *           type: "base64",
 *           media_type: "image/jpeg",
 *           data: base64Image,
 *         },
 *       },
 *       { type: "text", text: prompt }
 *     ],
 *   }],
 * });
 */

import type {
  LLMProvider,
  TextGenerationOptions,
  ImageAnalysisOptions,
  LLMConfig,
} from '../types';
import { LLMError } from '../types';

export class ClaudeProvider implements LLMProvider {
  constructor(config: LLMConfig) {
    // TODO: Initialize Anthropic client
    throw new LLMError(
      'Claude provider not yet implemented. See source file for implementation guide.',
      'claude'
    );
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    // TODO: Implement using anthropic.messages.create()
    throw new LLMError('Claude provider not implemented', 'claude');
  }

  async analyzeImage(
    imageData: string,
    prompt: string,
    options?: ImageAnalysisOptions
  ): Promise<string> {
    // TODO: Implement using Claude's vision API
    // Convert image to base64 if needed
    // Detect media type from data URI
    throw new LLMError('Claude provider not implemented', 'claude');
  }

  async editText(
    text: string,
    instruction: string,
    options?: TextGenerationOptions
  ): Promise<string> {
    // TODO: Implement using messages API with system prompt
    throw new LLMError('Claude provider not implemented', 'claude');
  }

  async isAvailable(): Promise<boolean> {
    // TODO: Check if API key is set and valid
    return false;
  }
}