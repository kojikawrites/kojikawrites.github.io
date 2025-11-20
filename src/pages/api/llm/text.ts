/**
 * LLM Text API Endpoint
 *
 * Provides text generation and editing capabilities using configured LLM provider.
 * DEV MODE ONLY - Not available in production builds.
 *
 * POST /api/llm/text
 * Body: {
 *   operation: 'generate' | 'edit' | 'continue' | 'summarize' | 'expand' | 'improve' | 'rewrite' | 'fix-grammar' | 'make-shorter' | 'make-longer',
 *   prompt?: string,           // For generate (optional, can use operation-specific prompt)
 *   text?: string,             // For edit and text operations
 *   instruction?: string,      // For edit (custom instruction)
 *   context?: string,          // Additional context (optional)
 *   systemPrompt?: string,     // Optional
 *   maxTokens?: number,        // Optional
 *   temperature?: number       // Optional
 * }
 */

import type { APIRoute } from 'astro';
import { getLLMService } from '../../../lib/services/llm/llmService';
import { LLMError } from '../../../lib/services/llm/types';

// the following line will be automatically commented out
// by the build process for production builds.
// export const prerender = false; // ![DEV-ONLY]

const OPERATION_PROMPTS = {
  continue: (text: string) => `Continue the following text naturally, maintaining the same tone, style, and perspective. Write 2-3 additional sentences that flow logically from the existing content.

IMPORTANT: Return ONLY the continuation text. Do not include any preamble like "Here's the continuation:" or commentary. Output only the new sentences that continue the text.

${text}`,

  summarize: (text: string) => `Summarize the following text concisely. Capture the main points in 1-2 sentences.

IMPORTANT: Return ONLY the summary text. Do not include any preamble like "Here's a summary:" or "Summary:" or commentary. Output only the summarized content.

${text}`,

  expand: (text: string) => `Expand on the following text by adding more detail, examples, or explanation. Maintain the same tone and perspective while making it more comprehensive.

IMPORTANT: Return ONLY the expanded text as a drop-in replacement. Do not include any preamble like "Here's an expanded version:" or commentary. Output only the full expanded text.

${text}`,

  improve: (text: string) => `Improve the following text by:
- Fixing grammar and spelling errors
- Enhancing clarity and flow
- Maintaining the original meaning and tone
- Making it more engaging and professional

IMPORTANT: Return ONLY the improved text as a drop-in replacement. Do not include any preamble like "Here's an improved version:" or commentary. Output only the improved text itself.

${text}`,

  rewrite: (text: string) => `Rewrite the following text to make it clearer, more concise, and more engaging while preserving the core message.

IMPORTANT: Return ONLY the rewritten text as a drop-in replacement. Do not include any preamble like "Here's a rewrite:" or commentary. Output only the rewritten content.

${text}`,

  'fix-grammar': (text: string) => `Fix any grammar, spelling, or punctuation errors in the following text. Preserve the original meaning and style.

IMPORTANT: Return ONLY the corrected text as a drop-in replacement. Do not include any preamble like "Here's the corrected text:" or commentary. Output only the text with fixes applied.

${text}`,

  'make-shorter': (text: string) => `Make the following text more concise while preserving all key information.

IMPORTANT: Return ONLY the shortened text as a drop-in replacement. Do not include any preamble like "Here's a shorter version:" or commentary. Output only the concise version.

${text}`,

  'make-longer': (text: string) => `Expand the following text with additional details, examples, or explanation. Maintain the same tone and style.

IMPORTANT: Return ONLY the expanded text as a drop-in replacement. Do not include any preamble like "Here's a longer version:" or commentary. Output only the expanded content.

${text}`,
};

export const POST: APIRoute = async ({ request }) => {
  // Only allow in development
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({
      error: 'LLM API not available in production'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('[LLM TEXT API] Request received');
    const body = await request.json();
    console.log('[LLM TEXT API] Body parsed:', { operation: body.operation });
    const { operation, prompt, text, instruction, systemPrompt, maxTokens, temperature } = body;

    if (!operation) {
      console.log('[LLM TEXT API] Missing operation');
      return new Response(JSON.stringify({
        error: 'Missing required field: operation'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[LLM TEXT API] Calling getLLMService()...');
    const llm = await getLLMService();
    console.log('[LLM TEXT API] LLM service obtained');

    let result: string;
    let finalPrompt: string;

    switch (operation) {
      case 'generate':
        if (!prompt) {
          return new Response(JSON.stringify({
            error: 'Missing required field: prompt'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        result = await llm.generateText(prompt, { systemPrompt, maxTokens, temperature });
        break;

      case 'edit':
        if (!text || !instruction) {
          return new Response(JSON.stringify({
            error: 'Missing required fields: text and instruction'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        result = await llm.editText(text, instruction, { systemPrompt, maxTokens, temperature });
        break;

      case 'continue':
      case 'summarize':
      case 'expand':
      case 'improve':
      case 'rewrite':
      case 'fix-grammar':
      case 'make-shorter':
      case 'make-longer':
        if (!text) {
          return new Response(JSON.stringify({
            error: 'Missing required field: text'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Use custom prompt or operation-specific prompt
        const operationPrompt = OPERATION_PROMPTS[operation as keyof typeof OPERATION_PROMPTS];
        finalPrompt = prompt || (typeof operationPrompt === 'function' ? operationPrompt(text) : '');

        result = await llm.generateText(finalPrompt, { systemPrompt, maxTokens, temperature });
        break;

      default:
        const validOperations = ['generate', 'edit', ...Object.keys(OPERATION_PROMPTS)];
        return new Response(JSON.stringify({
          error: `Unknown operation: ${operation}. Valid options: ${validOperations.join(', ')}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      operation
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LLM text API error:', error);

    if (error instanceof LLMError) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        provider: error.provider
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
