/**
 * LLM Text API Endpoint
 *
 * Provides text generation and editing capabilities using configured LLM provider.
 * DEV MODE ONLY - Not available in production builds.
 *
 * POST /api/llm/text
 * Body: {
 *   operation: 'generate' | 'edit' | 'continue' | 'summarize' | 'expand' | 'improve' | 'rewrite' | 'fix-grammar' | 'make-shorter' | 'generate-description' | 'suggest-categories' | 'suggest-tags',
 *   prompt?: string,           // For generate (optional, can use operation-specific prompt)
 *   text?: string,             // For edit and text operations
 *   instruction?: string,      // For edit (custom instruction)
 *   title?: string,            // For description/categories/tags generation
 *   content?: string,          // For description/categories/tags generation
 *   availableCategories?: string[],  // For category suggestions
 *   availableTags?: string[],  // For tag suggestions
 *   allowNew?: boolean,        // Allow suggesting new categories/tags
 *   context?: string,          // Additional context (optional)
 *   systemPrompt?: string,     // Optional
 *   maxTokens?: number,        // Optional
 *   temperature?: number       // Optional
 * }
 */

import type {APIRoute} from 'astro';
import {getLLMService, getLLMConfig} from '../../../lib/services/llm/llmService';
import {LLMError} from '../../../lib/services/llm/types';
import {createTextSchema, createArraySchema} from './schemas';
import {extractAndValidateJSON, extractFieldValue, type ExpectedType} from '../../../lib/services/llm/jsonUtils';
import {
    buildTextOperationPrompt,
    buildTaxonomySuggestionPrompt,
    buildDescriptionGenerationPrompt,
    buildColorBatchPrompt,
} from '../../../lib/services/llm/promptUtils';

// Get default max tokens from LLM config
const DEFAULT_MAX_TOKENS = getLLMConfig().maxTokens || 8192;

// the following line will be automatically commented out
// by the build process for production builds.
export const prerender = false; // ![DEV-ONLY]

const JSON_SCHEMA_TEXT = createTextSchema();

// Text transformation operations (take text and optional context as input)
// Uses shared buildTextOperationPrompt from promptUtils
const TEXT_OPERATION_PROMPTS = {
    continue: (text: string, context?: string) => buildTextOperationPrompt(
        'Continue the following text naturally, maintaining the same tone, style, and perspective. Write 2-3 additional sentences that flow logically from the existing content.',
        'TEXT TO CONTINUE',
        text,
        { context }
    ),

    summarize: (text: string, context?: string) => buildTextOperationPrompt(
        'Summarize the following text concisely. Capture the main points in 1-2 sentences.',
        'TEXT TO SUMMARIZE',
        text,
        { context }
    ),

    expand: (text: string, context?: string) => buildTextOperationPrompt(
        'Take the following text and EXPAND it into a longer, more detailed version.',
        'ORIGINAL TEXT TO EXPAND',
        text,
        {
            requirements: `- The expanded text MUST be significantly longer than the original (at least 50% more words)
- Add supporting details, examples, context, or elaboration
- Maintain the original meaning, tone, and perspective
- The result must be a SINGLE continuous piece of text (NOT a list, NOT bullet points, NOT separate sentences)
- Preserve the original structure but make it richer`,
            context
        }
    ),

    improve: (text: string, context?: string) => buildTextOperationPrompt(
        'Improve the following text by fixing grammar/spelling, enhancing clarity and flow, maintaining the original meaning and tone.',
        'TEXT TO IMPROVE',
        text,
        { context }
    ),

    rewrite: (text: string, context?: string) => buildTextOperationPrompt(
        'Rewrite the following text to make it clearer, more concise, and more engaging while preserving the core message.',
        'TEXT TO REWRITE',
        text,
        { context }
    ),

    'fix-grammar': (text: string, context?: string) => buildTextOperationPrompt(
        'Fix any grammar, spelling, or punctuation errors in the following text. Preserve the original meaning and style.',
        'TEXT TO FIX',
        text,
        { context }
    ),

    'make-shorter': (text: string, context?: string) => buildTextOperationPrompt(
        'Take the following text and make it SHORTER and more concise.',
        'ORIGINAL TEXT TO SHORTEN',
        text,
        {
            requirements: `- The shortened text MUST be noticeably shorter than the original (at least 25% fewer words)
- Remove redundant words, phrases, and unnecessary elaboration
- Keep all essential information and key points
- Maintain the original meaning and tone
- The result must be a SINGLE continuous piece of text (NOT a list, NOT bullet points)`,
            context
        }
    ),
} as const;

// Blog metadata operations use shared prompt builders from promptUtils

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

    try {
        console.log('[LLM TEXT API] Request received');
        const body = await request.json();
        console.log('[LLM TEXT API] Body parsed:', {operation: body.operation});
        const {
            operation, prompt, text, instruction,
            title, content, availableCategories, availableTags, allowNew,
            currentDescription,  // For generate-description: existing description to improve
            context,  // User-provided additional context
            systemPrompt, maxTokens, temperature, format
        } = body;

        if (!operation) {
            console.log('[LLM TEXT API] Missing operation');
            return new Response(JSON.stringify({
                error: 'Missing required field: operation'
            }), {
                status: 400,
                headers: {'Content-Type': 'application/json'}
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
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                result = await llm.generateText(prompt, {systemPrompt, maxTokens, temperature, format} as any);
                break;

            case 'edit':
                if (!text || !instruction) {
                    return new Response(JSON.stringify({
                        error: 'Missing required fields: text and instruction'
                    }), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                result = await llm.editText(text, instruction, {systemPrompt, maxTokens, temperature});
                break;

            case 'generate-description':
                if (!title || !content) {
                    return new Response(JSON.stringify({
                        error: 'Missing required fields: title and content'
                    }), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                finalPrompt = buildDescriptionGenerationPrompt(title, content, currentDescription, context);
                console.log('[LLM TEXT API] Generate description prompt:', finalPrompt);
                result = await llm.generateText(finalPrompt, {
                    maxTokens: maxTokens || DEFAULT_MAX_TOKENS,
                    temperature: temperature || 0.7,
                    format: createTextSchema('The blog post description')
                } as any);
                break;

            case 'suggest-categories':
                if (!title || !content || !availableCategories) {
                    return new Response(JSON.stringify({
                        error: 'Missing required fields: title, content, and availableCategories'
                    }), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                finalPrompt = buildTaxonomySuggestionPrompt('categories', title, content, availableCategories, allowNew || false);
                console.log('[LLM TEXT API] Suggest categories prompt:', finalPrompt);
                result = await llm.generateText(finalPrompt, {
                    maxTokens: maxTokens || DEFAULT_MAX_TOKENS,
                    temperature: temperature || 0.3,
                    format: createArraySchema('categories', 'Array of category slugs')
                } as any);
                break;

            case 'suggest-tags':
                if (!title || !content || !availableTags) {
                    return new Response(JSON.stringify({
                        error: 'Missing required fields: title, content, and availableTags'
                    }), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                finalPrompt = buildTaxonomySuggestionPrompt('tags', title, content, availableTags, allowNew || false);
                console.log('[LLM TEXT API] Suggest tags prompt:', finalPrompt);
                result = await llm.generateText(finalPrompt, {
                    maxTokens: maxTokens || DEFAULT_MAX_TOKENS,
                    temperature: temperature || 0.3,
                    format: createArraySchema('tags', 'Array of tag slugs')
                } as any);
                break;

            case 'generate-color-batch': {
                // Generate a batch of colors (part of sequential color scheme generation)
                const { creativeDirection, colorsToGenerate, previouslyGenerated, colorMode } = body;
                if (!creativeDirection || !colorsToGenerate) {
                    return new Response(JSON.stringify({
                        error: 'Missing required fields: creativeDirection and colorsToGenerate'
                    }), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                finalPrompt = buildColorBatchPrompt(
                    creativeDirection,
                    colorsToGenerate,
                    previouslyGenerated || [],
                    colorMode || 'both'
                );
                console.log('[LLM TEXT API] Color batch prompt:', finalPrompt);
                const configuredTimeout = getLLMConfig().timeout || 120000;
                result = await llm.generateText(finalPrompt, {
                    maxTokens: maxTokens || DEFAULT_MAX_TOKENS, // Use configured max tokens
                    temperature: temperature || 0.7,
                    timeout: configuredTimeout, // Use configured timeout
                    format: {
                        type: 'object',
                        properties: {
                            colors: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        light: { type: 'string' },
                                        dark: { type: 'string' }
                                    },
                                    required: ['name']
                                }
                            }
                        },
                        required: ['colors']
                    }
                } as any);
                break;
            }

            case 'continue':
            case 'summarize':
            case 'expand':
            case 'improve':
            case 'rewrite':
            case 'fix-grammar':
            case 'make-shorter':
                if (!text) {
                    return new Response(JSON.stringify({
                        error: 'Missing required field: text'
                    }), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }

                // Use custom prompt or operation-specific prompt (with optional user context)
                const operationPrompt = TEXT_OPERATION_PROMPTS[operation as keyof typeof TEXT_OPERATION_PROMPTS];
                finalPrompt = prompt || (operationPrompt ? operationPrompt(text, context) : '');
                console.log(`[LLM TEXT API] ${operation} prompt:`, finalPrompt);

                result = await llm.generateText(finalPrompt, {
                    systemPrompt,
                    maxTokens,
                    temperature,
                    format: JSON_SCHEMA_TEXT
                } as any);
                break;

            default:
                const validOperations = ['generate', 'edit', ...Object.keys(TEXT_OPERATION_PROMPTS), 'generate-description', 'suggest-categories', 'suggest-tags'];
                return new Response(JSON.stringify({
                    error: `Unknown operation: ${operation}. Valid options: ${validOperations.join(', ')}`
                }), {
                    status: 400,
                    headers: {'Content-Type': 'application/json'}
                });
        }

        // Validate and extract JSON from result
        // Determine which field to validate and its expected type based on operation
        let requiredField: string;
        let expectedType: ExpectedType;

        if (operation === 'suggest-categories') {
            requiredField = 'categories';
            expectedType = 'array';
        } else if (operation === 'suggest-tags') {
            requiredField = 'tags';
            expectedType = 'array';
        } else if (operation === 'generate-color-batch') {
            requiredField = 'colors';
            expectedType = 'array';
        } else {
            requiredField = 'text';
            expectedType = 'string';  // All text operations must return a string, not array
        }

        console.log('[LLM TEXT API] Raw LLM response:', result);
        console.log('[LLM TEXT API] Validating JSON response for field:', requiredField, 'expecting type:', expectedType);
        const validation = extractAndValidateJSON(result, requiredField);

        if (!validation.success) {
            console.error('[LLM TEXT API] JSON validation failed:', validation.error);
            return new Response(JSON.stringify({
                success: false,
                needsRetry: true,
                validationError: validation.error,
                rawResponse: result
            }), {
                status: 422, // Unprocessable Entity
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Extract the field value with type enforcement
        const extractedValue = extractFieldValue(validation.data, requiredField, expectedType);

        console.log('[LLM TEXT API] Extraction result:', {
            requiredField,
            expectedType,
            extractedValue,
            valueType: typeof extractedValue,
            isArray: Array.isArray(extractedValue),
            rawDataStructure: JSON.stringify(validation.data).substring(0, 200)
        });

        // Check if extraction actually found a value (type validation happens in extractFieldValue)
        if (extractedValue === undefined || extractedValue === null || extractedValue === '') {
            console.error('[LLM TEXT API] Extraction failed - no value found or wrong type returned');
            return new Response(JSON.stringify({
                success: false,
                needsRetry: true,
                validationError: `Field '${requiredField}' is missing, empty, or wrong type (expected ${expectedType})`,
                rawResponse: result
            }), {
                status: 422,
                headers: {'Content-Type': 'application/json'}
            });
        }

        console.log('[LLM TEXT API] Validation and extraction successful');
        return new Response(JSON.stringify({
            success: true,
            result: extractedValue,
            operation,
            validated: true
        }), {
            status: 200,
            headers: {'Content-Type': 'application/json'}
        });

    } catch (error) {
        console.error('LLM text API error:', error);
        console.error('Error type:', typeof error);
        console.error('Error constructor:', error?.constructor?.name);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }

        if (error instanceof LLMError) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message,
                provider: error.provider
            }), {
                status: 500,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // More detailed error message for debugging
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object') {
            errorMessage = JSON.stringify(error);
        }

        return new Response(JSON.stringify({
            success: false,
            error: errorMessage
        }), {
            status: 500,
            headers: {'Content-Type': 'application/json'}
        });
    }
};
