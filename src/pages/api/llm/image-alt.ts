/**
 * LLM Image Analysis API Endpoint
 *
 * Analyzes images and generates descriptions (e.g., for alt text).
 * DEV MODE ONLY - Not available in production builds.
 *
 * POST /api/llm/image-alt
 * Body: {
 *   image: string,             // Base64 encoded image with data URI
 *   mode?: 'alt' | 'description' | 'caption' | 'color',  // Type of output (default: 'alt')
 *   prompt?: string,           // Custom prompt (optional, overrides mode)
 *   context?: string,          // Additional context about the image (optional)
 *   maxTokens?: number,        // Optional
 *   temperature?: number       // Optional
 * }
 */

import type {APIRoute} from 'astro';
import {getLLMService} from '../../../lib/services/llm/llmService';
import {LLMError} from '../../../lib/services/llm/types';
import {createTextSchema, createColorAnalysisSchema} from './schemas';
import {extractAndValidateJSON, extractFieldValue} from '../../../lib/services/llm/jsonUtils';
import {
    buildImageAnalysisPrompt,
    TEXT_OUTPUT_EXAMPLE,
} from '../../../lib/services/llm/promptUtils';

// Dev-only route: runs on-demand in dev; excludeDevPages forces it to
// prerender in production builds and deletes its output from dist.
export const prerender = false;

// Image analysis mode prompts using shared utilities
const MODE_PROMPTS = {
    alt: (context?: string) => buildImageAnalysisPrompt(
        'Describe this image concisely for use as HTML alt text.',
        {
            requirements: `- Focus on what the image shows (objects, people, actions)
- Include important details for context
- Keep it under 125 characters if possible
- Be factual, objective, descriptive. Do not speculate.
- Skip phrases like "image of" or "picture of"`,
            context,
            outputExample: TEXT_OUTPUT_EXAMPLE,
        }
    ),

    description: (context?: string) => buildImageAnalysisPrompt(
        'Provide a detailed description of this image suitable for a blog post or article.',
        {
            requirements: `- Include main subject and composition
- Describe visual details (colors, lighting, mood)
- Mention context and setting
- Note any notable elements or features
- Be factual, objective, descriptive. Do not speculate.
- Write 2-4 complete sentences in a natural, engaging style
- End with complete sentences only - never end mid-sentence`,
            context,
            outputExample: TEXT_OUTPUT_EXAMPLE,
        }
    ),

    caption: (context?: string) => buildImageAnalysisPrompt(
        'Write a compelling caption for this image suitable for social media or blog posts.',
        {
            requirements: `- Make it engaging and attention-grabbing
- Keep to 1-2 sentences maximum
- Include relevant context or insights
- Use natural and conversational tone
- Be factual, objective, descriptive. Do not speculate.
- No hashtags or emojis unless contextually appropriate
- End with complete sentences only`,
            context,
            outputExample: TEXT_OUTPUT_EXAMPLE,
        }
    ),

    color: (context?: string) => buildImageAnalysisPrompt(
        'Analyze this background pattern image and identify its predominant color.',
        {
            requirements: `- Look at the overall image and determine the PRIMARY color that dominates
- For grayscale images, identify the gray tone (will have equal R, G, B values)
- For patterned images, identify the base/background color, not accent colors
- Return RGB values as integers from 0-255
- Be precise - the color will be used for CSS filter generation`,
            context,
            schemaJson: JSON.stringify(createColorAnalysisSchema(), null, 2),
        }
    ),
};

// Get the schema for a given mode
const getModeSchema = (mode: string) => {
    return mode === 'color' ? createColorAnalysisSchema() : createTextSchema('The generated image description');
};

// Get the expected field name for a given mode
const getModeFieldName = (mode: string) => {
    return mode === 'color' ? 'predominantColor' : 'text';
};

export const POST: APIRoute = async ({request}) => {
    // Only allow in development
    if (import.meta.env.PROD) {
        return new Response(JSON.stringify({
            error: 'LLM API not available in production'
        }), {
            status: 403,
            headers: {'Content-Type': 'application/json'}
        });
    }

    // Parse body once and save for potential retry in catch block
    const body = await request.json();

    try {
        const {image, mode = 'alt', prompt, context, maxTokens, temperature} = body;

        if (!image) {
            return new Response(JSON.stringify({
                error: 'Missing required field: image (base64 encoded with data URI)'
            }), {
                status: 400,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Validate image is base64 data URI
        // Accept data:image/* and also data:text/plain if it contains valid image magic bytes
        // (Keystatic sometimes creates blobs with incorrect MIME types)
        let processedImage = image;
        if (image.startsWith('data:text/plain;base64,')) {
            // Check if it's actually an image by looking at magic bytes
            const base64Content = image.split(',')[1];
            if (base64Content) {
                // PNG: iVBORw0KGgo, JPEG: /9j/, GIF: R0lGOD, WebP: UklGR
                if (base64Content.startsWith('iVBORw0KGgo')) {
                    processedImage = `data:image/png;base64,${base64Content}`;
                } else if (base64Content.startsWith('/9j/')) {
                    processedImage = `data:image/jpeg;base64,${base64Content}`;
                } else if (base64Content.startsWith('R0lGOD')) {
                    processedImage = `data:image/gif;base64,${base64Content}`;
                } else if (base64Content.startsWith('UklGR')) {
                    processedImage = `data:image/webp;base64,${base64Content}`;
                }
            }
        }

        if (!processedImage.startsWith('data:image/')) {
            // Provide helpful error message - only show type info, not raw content
            // (raw content like SVG can break JSON serialization)
            const typeHint = image.startsWith('data:')
                ? image.substring(0, image.indexOf(';') > 0 ? image.indexOf(';') : 50)
                : image.startsWith('/')
                    ? `file path: ${image.substring(0, 100)}`
                    : `unknown (length: ${image.length})`;
            return new Response(JSON.stringify({
                error: `Invalid image format. Expected base64 data URI (data:image/...) but received: ${typeHint}`
            }), {
                status: 400,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Use processedImage (with corrected MIME type if needed) from here on

        // Validate mode
        if (mode && !['alt', 'description', 'caption', 'color'].includes(mode)) {
            return new Response(JSON.stringify({
                error: 'Invalid mode. Must be one of: alt, description, caption, color'
            }), {
                status: 400,
                headers: {'Content-Type': 'application/json'}
            });
        }

        const llm = await getLLMService();

        // Build prompt: custom prompt > mode-specific prompt (with context) > default
        const modePromptGenerator = MODE_PROMPTS[mode as keyof typeof MODE_PROMPTS];
        // Context is now handled by the shared buildImageAnalysisPrompt function
        const finalPrompt = prompt || (modePromptGenerator ? modePromptGenerator(context) : MODE_PROMPTS.alt(context));

        // Get the appropriate schema for this mode
        const schema = getModeSchema(mode);
        const expectedField = getModeFieldName(mode);

        const result = await llm.analyzeImage(processedImage, finalPrompt, {
            maxTokens,
            temperature,
            format: schema
        } as any);

        // Validate and extract JSON from result
        console.log('[LLM IMAGE-ALT API] Raw LLM response:', result);
        const validation = extractAndValidateJSON(result, expectedField);

        if (!validation.success) {
            console.error('[LLM IMAGE-ALT API] JSON validation failed:', validation.error);
            return new Response(JSON.stringify({
                success: false,
                needsRetry: true,
                validationError: validation.error,
                rawResponse: result
            }), {
                status: 422,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Extract the expected field value
        // For color mode, we need to preserve the object structure, so access directly
        console.log('[LLM IMAGE-ALT API] Before extraction - mode:', mode, 'expectedField:', expectedField);

        let extractedValue: any;
        if (mode === 'color') {
            // Direct access to preserve {r, g, b} object structure
            extractedValue = validation.data[expectedField];

            console.log('[LLM IMAGE-ALT API] Color mode extraction debug:', {
                expectedField,
                dataKeys: Object.keys(validation.data),
                extractedValue,
                extractedValueType: typeof extractedValue,
                fullDataStructure: JSON.stringify(validation.data, null, 2).substring(0, 500)
            });
        } else {
            // For text modes, use smart extraction to unwrap nested values
            console.log('[LLM IMAGE-ALT API] Using extractFieldValue for mode:', mode);
            extractedValue = extractFieldValue(validation.data, expectedField);
        }

        console.log('[LLM IMAGE-ALT API] Extraction result:', {
            extractedValue,
            valueType: typeof extractedValue,
            rawDataStructure: JSON.stringify(validation.data).substring(0, 200)
        });

        // For color mode, validate the RGB object structure
        if (mode === 'color') {
            if (!extractedValue || typeof extractedValue !== 'object' || Array.isArray(extractedValue)) {
                console.error('[LLM IMAGE-ALT API] Color extraction failed - invalid structure');
                return new Response(JSON.stringify({
                    success: false,
                    needsRetry: true,
                    validationError: "predominantColor must be an object with r, g, b properties",
                    rawResponse: result
                }), {
                    status: 422,
                    headers: {'Content-Type': 'application/json'}
                });
            }

            const color = extractedValue as { r: number; g: number; b: number };

            // Validate that r, g, b properties exist and are numbers
            if (typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
                console.error('[LLM IMAGE-ALT API] Color extraction failed - missing or invalid r, g, b properties');
                return new Response(JSON.stringify({
                    success: false,
                    needsRetry: true,
                    validationError: "predominantColor must have numeric r, g, b properties",
                    rawResponse: result
                }), {
                    status: 422,
                    headers: {'Content-Type': 'application/json'}
                });
            }

            // Clamp RGB values to 0-255 range
            const clampedColor = {
                r: Math.max(0, Math.min(255, Math.round(color.r))),
                g: Math.max(0, Math.min(255, Math.round(color.g))),
                b: Math.max(0, Math.min(255, Math.round(color.b))),
            };

            console.log('[LLM IMAGE-ALT API] Color extraction successful');
            return new Response(JSON.stringify({
                success: true,
                predominantColor: clampedColor,
                prompt: finalPrompt,
                validated: true
            }), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // For text modes, check if extraction actually found a value
        if (extractedValue === undefined || extractedValue === null || extractedValue === '') {
            console.error('[LLM IMAGE-ALT API] Extraction failed - no value found');
            return new Response(JSON.stringify({
                success: false,
                needsRetry: true,
                validationError: `Field '${expectedField}' exists but contains no extractable value`,
                rawResponse: result
            }), {
                status: 422,
                headers: {'Content-Type': 'application/json'}
            });
        }

        console.log('[LLM IMAGE-ALT API] Validation and extraction successful');
        return new Response(JSON.stringify({
            success: true,
            altText: extractedValue,
            prompt: finalPrompt,
            validated: true
        }), {
            status: 200,
            headers: {'Content-Type': 'application/json'}
        });

    } catch (error) {
        console.error('LLM image-alt API error:', error);

        if (error instanceof LLMError) {
            // Check if this is an unsupported image format error
            const isUnsupportedFormat = error.message.includes('unknown format') ||
                error.message.includes('unsupported') ||
                error.message.includes('failed to process');

            // If unsupported format, try converting to PNG and retry once
            if (isUnsupportedFormat) {
                console.log('[LLM IMAGE-ALT API] Unsupported format detected, attempting conversion to PNG');
                try {
                    // Use the already-parsed body from the top of the function
                    const { image, mode = 'alt', prompt, context, maxTokens, temperature } = body;

                    // Call build-service to convert image to PNG
                    const buildServiceUrl = 'http://build-service:8000/convert-image';
                    const convertResponse = await fetch(buildServiceUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: image,
                            format: 'png',
                            background: '#ffffff'
                        })
                    });

                    if (!convertResponse.ok) {
                        const errorBody = await convertResponse.text();
                        throw new Error(`Conversion service error: ${convertResponse.status} - ${errorBody}`);
                    }

                    const convertResult = await convertResponse.json();
                    if (!convertResult.success || !convertResult.image) {
                        throw new Error(convertResult.error || 'Conversion failed');
                    }

                    console.log('[LLM IMAGE-ALT API] Image converted to PNG, retrying LLM call');
                    // The build-service returns a full data URI in the 'image' field
                    const convertedImage = convertResult.image;

                    // Retry with converted image
                    const llm = await getLLMService();
                    const modePromptGenerator = MODE_PROMPTS[mode as keyof typeof MODE_PROMPTS];
                    const finalPrompt = prompt || (modePromptGenerator ? modePromptGenerator(context) : MODE_PROMPTS.alt(context));
                    const schema = getModeSchema(mode);
                    const expectedField = getModeFieldName(mode);

                    const result = await llm.analyzeImage(convertedImage, finalPrompt, {
                        maxTokens,
                        temperature,
                        format: schema
                    } as any);

                    // Process result (same logic as above)
                    const validation = extractAndValidateJSON(result, expectedField);
                    if (!validation.success) {
                        return new Response(JSON.stringify({
                            success: false,
                            needsRetry: true,
                            validationError: validation.error,
                            rawResponse: result
                        }), {
                            status: 422,
                            headers: {'Content-Type': 'application/json'}
                        });
                    }

                    let extractedValue: any;
                    if (mode === 'color') {
                        extractedValue = validation.data[expectedField];
                        if (!extractedValue || typeof extractedValue !== 'object' || Array.isArray(extractedValue)) {
                            return new Response(JSON.stringify({
                                success: false,
                                needsRetry: true,
                                validationError: "predominantColor must be an object with r, g, b properties",
                                rawResponse: result
                            }), {
                                status: 422,
                                headers: {'Content-Type': 'application/json'}
                            });
                        }
                        const color = extractedValue as { r: number; g: number; b: number };
                        if (typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
                            return new Response(JSON.stringify({
                                success: false,
                                needsRetry: true,
                                validationError: "predominantColor must have numeric r, g, b properties",
                                rawResponse: result
                            }), {
                                status: 422,
                                headers: {'Content-Type': 'application/json'}
                            });
                        }
                        const clampedColor = {
                            r: Math.max(0, Math.min(255, Math.round(color.r))),
                            g: Math.max(0, Math.min(255, Math.round(color.g))),
                            b: Math.max(0, Math.min(255, Math.round(color.b))),
                        };
                        return new Response(JSON.stringify({
                            success: true,
                            predominantColor: clampedColor,
                            prompt: finalPrompt,
                            validated: true,
                            converted: true
                        }), {
                            status: 200,
                            headers: {'Content-Type': 'application/json'}
                        });
                    } else {
                        extractedValue = extractFieldValue(validation.data, expectedField);
                        if (extractedValue === undefined || extractedValue === null || extractedValue === '') {
                            return new Response(JSON.stringify({
                                success: false,
                                needsRetry: true,
                                validationError: `Field '${expectedField}' exists but contains no extractable value`,
                                rawResponse: result
                            }), {
                                status: 422,
                                headers: {'Content-Type': 'application/json'}
                            });
                        }
                        return new Response(JSON.stringify({
                            success: true,
                            altText: extractedValue,
                            prompt: finalPrompt,
                            validated: true,
                            converted: true
                        }), {
                            status: 200,
                            headers: {'Content-Type': 'application/json'}
                        });
                    }
                } catch (retryError) {
                    console.error('[LLM IMAGE-ALT API] Conversion/retry failed:', retryError);
                    // Fall through to return original error
                }
            }

            return new Response(JSON.stringify({
                success: false,
                error: error.message,
                provider: error.provider
            }), {
                status: isUnsupportedFormat ? 415 : 500,
                headers: {'Content-Type': 'application/json'}
            });
        }

        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
};
