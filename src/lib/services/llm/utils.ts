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