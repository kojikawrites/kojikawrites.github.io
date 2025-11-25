/**
 * LLM Service Utilities
 *
 * Shared utility functions for LLM providers
 */

/**
 * Calculate effective max tokens based on context window and requested tokens.
 *
 * The context window is the total number of tokens the model can process
 * (prompt + response combined). We need to leave room for the prompt.
 *
 * @param contextWindow - Total token capacity of the model
 * @param requestedTokens - Tokens requested for response (from config or options)
 * @param reserveForPrompt - Percentage of context to reserve for prompt (default 25%)
 * @returns Safe max tokens for response that fits within context window
 */
export function getEffectiveMaxTokens(
  contextWindow: number,
  requestedTokens: number,
  reserveForPrompt: number = 0.25
): number {
  // Calculate max safe response tokens (leave room for prompt)
  // Use 75% of context window by default for response
  const maxSafeTokens = Math.floor(contextWindow * (1 - reserveForPrompt));

  // Return the minimum of requested and safe maximum
  return Math.min(requestedTokens, maxSafeTokens);
}

/**
 * Estimate token count from text (rough approximation)
 * Rule of thumb: 1 token ≈ 4 characters for English text
 *
 * @param text - Text to estimate token count for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if a prompt would exceed the context window
 *
 * @param promptText - The prompt text
 * @param maxTokens - Requested max tokens for response
 * @param contextWindow - Model's context window size
 * @returns True if the request would fit, false if it exceeds context
 */
export function fitsInContext(
  promptText: string,
  maxTokens: number,
  contextWindow: number
): boolean {
  const estimatedPromptTokens = estimateTokenCount(promptText);
  const totalEstimated = estimatedPromptTokens + maxTokens;
  return totalEstimated <= contextWindow;
}

/**
 * Recursively fix a JSON schema for OpenAI's strict mode requirements:
 * - `additionalProperties: false` on ALL object types
 * - `required` must include ALL properties defined in an object
 *
 * @param schema - JSON schema object or sub-schema
 * @returns Schema fixed for OpenAI strict mode
 */
function fixSchemaForStrictMode(schema: Record<string, any>): Record<string, any> {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const result: Record<string, any> = { ...schema };

  // If this is an object type, add additionalProperties: false and ensure required includes all props
  if (result.type === 'object') {
    result.additionalProperties = false;

    // Recursively process properties and ensure all are required
    if (result.properties) {
      const propKeys = Object.keys(result.properties);

      // OpenAI strict mode requires all properties to be in required
      result.required = propKeys;

      result.properties = Object.fromEntries(
        Object.entries(result.properties).map(([key, value]) => [
          key,
          fixSchemaForStrictMode(value as Record<string, any>)
        ])
      );
    }
  }

  // If this is an array, process the items schema
  if (result.type === 'array' && result.items) {
    result.items = fixSchemaForStrictMode(result.items);
  }

  // Handle anyOf, oneOf, allOf
  for (const combiner of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(result[combiner])) {
      result[combiner] = result[combiner].map((s: Record<string, any>) =>
        fixSchemaForStrictMode(s)
      );
    }
  }

  return result;
}

/**
 * Build OpenAI-compatible response format for structured JSON output.
 *
 * OpenAI's strict mode requires `additionalProperties: false` on ALL object types,
 * including nested objects and array items. This function recursively adds
 * this property throughout the entire schema.
 *
 * @param schema - JSON schema object defining the expected structure
 * @param name - Name for the schema (default: 'response')
 * @returns OpenAI-compatible response_format object
 */
export function buildJsonResponseFormat(
  schema: Record<string, any>,
  name: string = 'response'
): {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, any>;
  };
} {
  // Recursively fix schema for OpenAI strict mode
  const fixedSchema = fixSchemaForStrictMode(schema);

  return {
    type: 'json_schema',
    json_schema: {
      name,
      strict: true,
      schema: fixedSchema,
    },
  };
}