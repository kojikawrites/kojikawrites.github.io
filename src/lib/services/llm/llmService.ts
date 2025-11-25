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
  // Get provider from env, default to auto-detection
  let provider = import.meta.env.LLM_PROVIDER as LLMProviderType | undefined;

  // Determine Ollama URL based on provider type
  let ollamaUrl: string | undefined;

  if (provider === 'ollama-docker') {
    // Containerized Ollama: fixed internal Docker network URL
    ollamaUrl = 'http://ollama:11434';
  } else if (provider === 'ollama') {
    // External Ollama: URL must be specified
    ollamaUrl = import.meta.env.LLM_OLLAMA_URL;
    if (!ollamaUrl) {
      console.warn('LLM_PROVIDER=ollama but LLM_OLLAMA_URL not set. Defaulting to http://host.docker.internal:11434');
      ollamaUrl = 'http://host.docker.internal:11434';
    }
  } else if (provider === 'docker') {
    // Docker Model Runner: URL injected by Docker or from config
    ollamaUrl = import.meta.env.LLM_TEXT_URL || import.meta.env.LLM_URL;
  } else if (!provider) {
    // Auto-detect provider
    const hasDockerTextUrl = !!import.meta.env.LLM_TEXT_URL;
    const dockerUrl = import.meta.env.LLM_TEXT_URL || import.meta.env.LLM_URL;
    const isDockerModelRunner = dockerUrl?.includes('model-runner.docker.internal');
    const hasDockerModel = import.meta.env.LLM_TEXT_MODEL?.startsWith('ai/') || import.meta.env.LLM_MODEL?.startsWith('ai/');

    if (hasDockerTextUrl || isDockerModelRunner || hasDockerModel) {
      provider = 'docker';
      ollamaUrl = dockerUrl;
      console.log(`Auto-detected LLM provider: docker${hasDockerTextUrl ? ' (from LLM_TEXT_URL)' : ''}${isDockerModelRunner ? ' (from URL)' : ''}${hasDockerModel ? ' (from MODEL)' : ''}`);
    } else {
      // Default to ollama-docker if no explicit config
      provider = 'ollama-docker';
      ollamaUrl = 'http://ollama:11434';
      console.log('Auto-detected LLM provider: ollama-docker (default)');
    }
  }

  // Both 'ollama' and 'ollama-docker' use the OllamaProvider
  const isOllamaProvider = provider === 'ollama' || provider === 'ollama-docker';

  return {
    provider,
    maxTokens: parseInt(import.meta.env.LLM_MAX_TOKENS || '8192'),
    temperature: parseFloat(import.meta.env.LLM_TEMPERATURE || '0.7'),
    timeout: parseInt(import.meta.env.LLM_TIMEOUT || '30000'),
    // Context sizes: 0 means "use model's native maximum"
    textContextSize: parseInt(import.meta.env.LLM_TEXT_CONTEXT_SIZE || '0'),
    visionContextSize: parseInt(import.meta.env.LLM_VISION_CONTEXT_SIZE || '0'),

    // Docker Model Runner config
    dockerUrl: provider === 'docker' ? ollamaUrl : undefined,
    dockerModel: provider === 'docker' ? (import.meta.env.LLM_MODEL || import.meta.env.LLM_DOCKER_MODEL) : undefined,
    dockerTextModel: provider === 'docker' ? (import.meta.env.LLM_TEXT_MODEL || import.meta.env.LLM_DOCKER_TEXT_MODEL) : undefined,
    dockerVisionModel: provider === 'docker' ? (import.meta.env.LLM_VISION_MODEL || import.meta.env.LLM_DOCKER_VISION_MODEL) : undefined,

    // Ollama config (both 'ollama' and 'ollama-docker' use these)
    ollamaUrl: isOllamaProvider ? ollamaUrl : undefined,
    ollamaModel: isOllamaProvider ? (import.meta.env.LLM_OLLAMA_MODEL || import.meta.env.LLM_MODEL) : undefined,
    ollamaTextModel: isOllamaProvider ? import.meta.env.LLM_OLLAMA_TEXT_MODEL : undefined,
    ollamaVisionModel: isOllamaProvider ? import.meta.env.LLM_OLLAMA_VISION_MODEL : undefined,

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
    case 'ollama-docker':
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
