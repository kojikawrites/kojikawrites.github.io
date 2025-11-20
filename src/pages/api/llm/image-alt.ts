/**
 * LLM Image Analysis API Endpoint
 *
 * Analyzes images and generates descriptions (e.g., for alt text).
 * DEV MODE ONLY - Not available in production builds.
 *
 * POST /api/llm/image-alt
 * Body: {
 *   image: string,             // Base64 encoded image with data URI
 *   mode?: 'alt' | 'description' | 'caption',  // Type of output (default: 'alt')
 *   prompt?: string,           // Custom prompt (optional, overrides mode)
 *   context?: string,          // Additional context about the image (optional)
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

const MODE_PROMPTS = {
  alt: `Describe this image concisely for use as HTML alt text. Focus on:
- What the image shows (objects, people, actions)
- Important details for context
- Keep it under 125 characters if possible
- IMPORTANT! Be factual, objective, descriptive. Do not speculate.
- Skip phrases like "image of" or "picture of"
- Return ONLY the description. Do not add meta-commentary like "The text is cut off" or similar.`,

  description: `Provide a detailed description of this image suitable for a blog post or article. Include:
- Main subject and composition
- Visual details (colors, lighting, mood)
- Context and setting
- Any notable elements or features
- IMPORTANT! Be factual, objective, descriptive. Do not speculate.
- Write 2-4 complete sentences in a natural, engaging style
- Return ONLY the description. Do not add meta-commentary like "..." or "(The rest is cut off)" or similar.
- End with complete sentences only - never end mid-sentence.`,

  caption: `Write a compelling caption for this image suitable for social media or blog posts. Make it:
- Engaging and attention-grabbing
- 1-2 sentences maximum
- Include relevant context or insights
- Natural and conversational tone
- IMPORTANT! Be factual, objective, descriptive. Do not speculate.
- No hashtags or emojis unless contextually appropriate
- Return ONLY the caption. Do not add meta-commentary or ellipsis.
- End with complete sentences only.`,
};

const DEFAULT_ALT_TEXT_PROMPT = MODE_PROMPTS.alt;

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
    const body = await request.json();
    const { image, mode = 'alt', prompt, context, maxTokens, temperature } = body;

    if (!image) {
      return new Response(JSON.stringify({
        error: 'Missing required field: image (base64 encoded with data URI)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate image is base64 data URI
    if (!image.startsWith('data:image/')) {
      return new Response(JSON.stringify({
        error: 'Invalid image format. Expected base64 data URI (data:image/...)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate mode
    if (mode && !['alt', 'description', 'caption'].includes(mode)) {
      return new Response(JSON.stringify({
        error: 'Invalid mode. Must be one of: alt, description, caption'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const llm = await getLLMService();

    // Build prompt: custom prompt > mode-specific prompt > default
    let finalPrompt = prompt || MODE_PROMPTS[mode as keyof typeof MODE_PROMPTS] || DEFAULT_ALT_TEXT_PROMPT;
    if (context) {
      finalPrompt = `Context (may contain markdown formatting): ${context}\n\n${finalPrompt}`;
    }

    const result = await llm.analyzeImage(image, finalPrompt, {
      maxTokens,
      temperature,
    });

    // Clean up result (remove quotes, trim whitespace)
    const altText = result
      .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
      .trim();

    return new Response(JSON.stringify({
      success: true,
      altText,
      prompt: finalPrompt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LLM image-alt API error:', error);

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
