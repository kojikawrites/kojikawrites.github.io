/**
 * LLM Service - Main entry point for LLM operations
 *
 * Automatically selects and configures the appropriate LLM provider
 * based on environment variables.
 *
 * Usage:
 *   import { getLLMService } from '@/lib/services/llm/llmService';
 *
 *   const llm = await getLLMService();
 *   const altText = await llm.analyzeImage(imageData, "Describe this image for alt text");
 */

import type { LLMProvider, LLMConfig, LLMProviderType } from './types';
import { LLMError } from './types';
import { DockerProvider } from './providers/docker';
import { OllamaProvider } from './providers/ollama';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';

/**
 * Load LLM configuration from environment variables
 */
function loadConfig(): LLMConfig {
  // Auto-detect Docker Model Runner: if LLM_URL or LLM_MODEL are set by Docker
  let provider = import.meta.env.LLM_PROVIDER as LLMProviderType | undefined;

  // LLM_URL is set by:
  // 1. Docker Model Runner (auto-injected as LLM_TEXT_URL/LLM_VISION_URL for dual-model)
  // 2. Docker Model Runner (auto-injected as LLM_URL for single-model - legacy)
  // 3. docker-compose.yaml (from LLM_OLLAMA_URL when using custom Ollama)
  // Fallback to LLM_OLLAMA_URL for backward compatibility
  let ollamaUrl = import.meta.env.LLM_TEXT_URL || import.meta.env.LLM_URL || import.meta.env.LLM_OLLAMA_URL;

  // Auto-detect Docker Model Runner if not explicitly set
  if (!provider) {
    const hasDockerTextUrl = !!import.meta.env.LLM_TEXT_URL;
    const hasDockerUrl = ollamaUrl?.includes('model-runner.docker.internal');
    const hasDockerModel = import.meta.env.LLM_TEXT_MODEL?.startsWith('ai/') || import.meta.env.LLM_MODEL?.startsWith('ai/');
    provider = (hasDockerTextUrl || hasDockerUrl || hasDockerModel) ? 'docker' : 'ollama';
    console.log(`Auto-detected LLM provider: ${provider}${hasDockerTextUrl ? ' (from LLM_TEXT_URL)' : ''}${hasDockerUrl ? ' (from URL)' : ''}${hasDockerModel ? ' (from MODEL)' : ''}`);
  }

  // Build full URL from LLM_OLLAMA_URL and LLM_OLLAMA_PORT if port is specified
  // Skip for Docker Model Runner URLs (they already include the full path)
  const isDockerModelRunner = ollamaUrl?.includes('model-runner.docker.internal');
  if (!isDockerModelRunner && import.meta.env.LLM_OLLAMA_PORT && ollamaUrl && !ollamaUrl.match(/:\d+$/)) {
    ollamaUrl = `${ollamaUrl}:${import.meta.env.LLM_OLLAMA_PORT}`;
  }

  return {
    provider,
    maxTokens: parseInt(import.meta.env.LLM_MAX_TOKENS || '2048'),
    temperature: parseFloat(import.meta.env.LLM_TEMPERATURE || '0.7'),
    timeout: parseInt(import.meta.env.LLM_TIMEOUT || '30000'),
    contextSize: parseInt(import.meta.env.LLM_CONTEXT_SIZE || '8192'),

    // Docker Model Runner config
    // Priority: LLM_TEXT_MODEL (injected by Docker), then LLM_DOCKER_TEXT_MODEL (manual config), then LLM_MODEL (legacy)
    dockerUrl: provider === 'docker' ? ollamaUrl : undefined,
    dockerModel: provider === 'docker' ? (import.meta.env.LLM_MODEL || import.meta.env.LLM_DOCKER_MODEL) : undefined,
    dockerTextModel: provider === 'docker' ? (import.meta.env.LLM_TEXT_MODEL || import.meta.env.LLM_DOCKER_TEXT_MODEL) : undefined,
    dockerVisionModel: provider === 'docker' ? (import.meta.env.LLM_VISION_MODEL || import.meta.env.LLM_DOCKER_VISION_MODEL) : undefined,

    // Ollama config
    ollamaUrl: provider === 'ollama' ? ollamaUrl : undefined,
    ollamaModel: provider === 'ollama' ? (import.meta.env.LLM_OLLAMA_MODEL || import.meta.env.LLM_MODEL) : undefined,
    ollamaTextModel: provider === 'ollama' ? import.meta.env.LLM_OLLAMA_TEXT_MODEL : undefined,
    ollamaVisionModel: provider === 'ollama' ? import.meta.env.LLM_OLLAMA_VISION_MODEL : undefined,

    // OpenAI config (future)
    openaiApiKey: import.meta.env.LLM_OPENAI_API_KEY,
    openaiTextModel: import.meta.env.LLM_OPENAI_TEXT_MODEL,
    openaiVisionModel: import.meta.env.LLM_OPENAI_VISION_MODEL,

    // Claude config (future)
    anthropicApiKey: import.meta.env.LLM_ANTHROPIC_API_KEY,
    anthropicTextModel: import.meta.env.LLM_ANTHROPIC_TEXT_MODEL,
    anthropicVisionModel: import.meta.env.LLM_ANTHROPIC_VISION_MODEL,
  };
}

/**
 * Create LLM provider instance based on configuration
 */
function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'docker':
      return new DockerProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'claude':
      return new ClaudeProvider(config);
    default:
      throw new LLMError(
        `Unknown LLM provider: ${config.provider}. Valid options: docker, ollama, openai, claude`,
        config.provider
      );
  }
}

let cachedProvider: LLMProvider | null = null;

/**
 * Get configured LLM service instance
 * Provider is cached after first initialization
 */
export async function getLLMService(): Promise<LLMProvider> {
  console.log('[getLLMService] Called');
  if (cachedProvider) {
    console.log('[getLLMService] Returning cached provider');
    return cachedProvider;
  }

  console.log('[getLLMService] Loading config...');
  const config = loadConfig();
  console.log('[getLLMService] Config loaded:', { provider: config.provider, dockerUrl: config.dockerUrl, dockerTextModel: config.dockerTextModel });

  console.log('[getLLMService] Creating provider...');
  const provider = createProvider(config);

  // Verify provider is available
  console.log('[getLLMService] Checking if provider is available...');
  const available = await provider.isAvailable();
  console.log('[getLLMService] Provider available:', available);

  if (!available) {
    console.error('[getLLMService] Provider not available');
    throw new LLMError(
      `LLM provider '${config.provider}' is not available. ` +
      `Check configuration and ensure the service is running.`,
      config.provider
    );
  }

  console.log('[getLLMService] Caching and returning provider');
  cachedProvider = provider;
  return provider;
}

/**
 * Clear cached provider (useful for testing or config changes)
 */
export function resetLLMService(): void {
  cachedProvider = null;
}

/**
 * Get current LLM configuration without creating provider
 */
export function getLLMConfig(): LLMConfig {
  return loadConfig();
}
