/**
 * Shared Prompt Utilities for LLM API Endpoints
 *
 * Provides consistent prompt formatting across all LLM operations.
 */

// Example output formats (more effective than showing schema)
export const TEXT_OUTPUT_EXAMPLE = '{"text": "<YOUR CONTENT HERE>"}';
export const ARRAY_OUTPUT_EXAMPLE = (fieldName: string) => `{"${fieldName}": ["item1", "item2", "item3"]}`;

// Common JSON output instruction
export const JSON_OUTPUT_INSTRUCTION = `CRITICAL: Respond with ONLY a single JSON object. Do NOT include any text before or after the JSON.`;

// Instruction to avoid common LLM writing patterns
export const AVOID_LLMISMS_INSTRUCTION = `WRITING STYLE - AVOID THESE COMMON AI PATTERNS:
- Do NOT start with "I" or use first person unless the original text does
- Do NOT use filler phrases like "Certainly!", "Absolutely!", "Great question!"
- Do NOT use overused words: "delve", "crucial", "seamlessly", "cutting-edge", "leverage", "robust", "comprehensive"
- Do NOT use cliche phrases: "at the end of the day", "it's worth noting", "in today's world", "dive deep into"
- Do NOT use excessive hedging: "It's important to note that", "It should be mentioned that"
- Do NOT use unnecessary transitions: "Moreover", "Furthermore", "Additionally" at the start of every sentence
- Do NOT overuse tricolon lists (groups of three): "X, Y, and Z" - vary your list lengths
- Do NOT use the "adjective-noun that verb" pattern repeatedly: "A powerful tool that enables", "A comprehensive solution that provides"
- Write naturally and directly, as a skilled human writer would
- When appropriate, match the existing writing style as closely as possible`;

/**
 * Wrap input text/content with clear delimiters
 * Makes it clear to the LLM what content it should operate on
 */
export const wrapInputContent = (label: string, content: string): string => {
    return `<INPUT_CONTENT label="${label}">
${content}
</INPUT_CONTENT>`;
};

/**
 * Build user context/instructions section
 * Context may contain additional information about the content AND/OR instructions on how to process it
 *
 * @param context - User-provided context string (may be empty/undefined)
 * @returns Formatted context section or empty string if no context
 */
export const buildUserContextSection = (context?: string): string => {
    if (!context) return '';

    return `

IMPORTANT - ADDITIONAL USER INPUT:
The user has provided the following additional information and/or instructions.
This may include context about the content (background, purpose, audience) and/or specific instructions on how to process it.
You MUST incorporate this into your response:
<USER_INPUT>
${context}
</USER_INPUT>
Follow any instructions given above. They take priority over default behavior.`;
};

/**
 * Build a complete prompt for text transformation operations
 *
 * @param task - Description of the task to perform
 * @param inputLabel - Label for the input content section
 * @param text - The text to transform
 * @param options - Optional configuration
 * @returns Complete formatted prompt
 */
export const buildTextOperationPrompt = (
    task: string,
    inputLabel: string,
    text: string,
    options?: {
        requirements?: string;
        context?: string;
        outputExample?: string;
    }
): string => {
    const requirements = options?.requirements ? `\n\nREQUIREMENTS:\n${options.requirements}` : '';
    const contextSection = buildUserContextSection(options?.context);
    const inputSection = wrapInputContent(inputLabel, text);
    const outputExample = options?.outputExample || TEXT_OUTPUT_EXAMPLE;

    return `TASK: ${task}${requirements}

${AVOID_LLMISMS_INSTRUCTION}
${contextSection}

${JSON_OUTPUT_INSTRUCTION}

Example output format: ${outputExample}

${inputSection}`;
};

/**
 * Build a prompt for blog description generation
 * Uses the standard text operation prompt format
 *
 * @param title - Blog post title
 * @param content - Blog post content preview
 * @param currentDescription - Optional existing description to improve upon
 * @param context - Optional user-provided context/instructions
 * @returns Complete formatted prompt
 */
export const buildDescriptionGenerationPrompt = (
    title: string,
    content: string,
    currentDescription?: string,
    context?: string
): string => {
    const existingDescNote = currentDescription
        ? `\n- Current description provided below - improve upon it or generate fresh if needed`
        : '';

    const blogContent = currentDescription
        ? `Blog post title: ${title}\n\nBlog post content preview (first 1500 chars):\n${content}\n\nCurrent description:\n${currentDescription}`
        : `Blog post title: ${title}\n\nBlog post content preview (first 1500 chars):\n${content}`;

    return buildTextOperationPrompt(
        'Generate a compelling 2-4 sentence blog post description.',
        'BLOG POST',
        blogContent,
        {
            requirements: `- Summarize the main topic and key insights directly
- Use professional, informative, technical tone
- Make it suitable for SEO and blog listing pages
- Maintain factual accuracy based on the content
- DO NOT use framing like "In this blog post", "The author", "This article", or similar meta-references
- DO NOT overuse cliche phrases like "deep dive", "journey", "exploration"
- Write as a direct summary of the content itself, jumping straight into what's covered
- Focus on: technical details, approaches, implementations, tools, challenges, insights
- Can mention future work or potential enhancements if relevant
- Vary your opening structure - don't repeat patterns${existingDescNote}`,
            context,
        }
    );
};

/**
 * Build a complete prompt for image analysis operations
 *
 * @param task - Description of the task to perform
 * @param options - Optional configuration
 * @returns Complete formatted prompt (image is passed separately to the LLM)
 */
export const buildImageAnalysisPrompt = (
    task: string,
    options?: {
        requirements?: string;
        context?: string;
        outputExample?: string;
        schemaJson?: string;
    }
): string => {
    const requirements = options?.requirements ? `\n\nREQUIREMENTS:\n${options.requirements}` : '';
    const contextSection = buildUserContextSection(options?.context);
    const outputExample = options?.outputExample || TEXT_OUTPUT_EXAMPLE;

    // For image analysis, we include the schema in the prompt since the image is passed separately
    const schemaSection = options?.schemaJson
        ? `\n\nResponse schema:\n${options.schemaJson}\n`
        : '';

    return `TASK: ${task}${requirements}
${contextSection}
${schemaSection}
${JSON_OUTPUT_INSTRUCTION}

Example output format: ${outputExample}

Return ONLY the JSON object, nothing else.`;
};

/**
 * Build a prompt for taxonomy suggestions (categories/tags)
 *
 * @param type - 'categories' or 'tags'
 * @param title - Blog post title
 * @param content - Blog post content preview
 * @param available - List of available taxonomy items
 * @param allowNew - Whether to allow suggesting new items
 * @returns Complete formatted prompt
 */
export const buildTaxonomySuggestionPrompt = (
    type: 'categories' | 'tags',
    title: string,
    content: string,
    available: string[],
    allowNew: boolean
): string => {
    const availableStr = available.join(', ');
    const allowNewNote = allowNew
        ? `\n\nIf none of the existing ${type} fit well, you may suggest new ${type}.`
        : '';
    const countGuidance = type === 'categories' ? '1-3' : '3-6';

    return `Analyze this blog post and suggest the most appropriate ${type}.

Available ${type}: ${availableStr}${allowNewNote}

Blog post title: ${title}

Blog post content preview (first 1500 chars):
${content}

${JSON_OUTPUT_INSTRUCTION}

Example output format: ${ARRAY_OUTPUT_EXAMPLE(type)}

Choose ${countGuidance} ${type} that best ${type === 'categories' ? 'fit' : 'describe'} the content.`;
};

/**
 * Build a prompt for batched color scheme generation
 * Generates colors in batches, with previously generated colors as context
 *
 * @param creativeDirection - User's description of desired theme
 * @param colorsToGenerate - The batch of colors to generate in this request
 * @param previouslyGenerated - Colors already generated (for context/harmony)
 * @param mode - 'light' | 'dark' | 'both' - which mode(s) to generate
 * @returns Complete formatted prompt
 */
export const buildColorBatchPrompt = (
    creativeDirection: string,
    colorsToGenerate: Array<{ name: string; light: string; dark: string; themeIndependent?: boolean; purpose?: string }>,
    previouslyGenerated: Array<{ name: string; light: string; dark: string }>,
    mode: 'light' | 'dark' | 'both'
): string => {
    // Format the colors to generate
    const toGenerateJson = colorsToGenerate.map(c => {
        // Use the provided purpose metadata, or fall back to formatted name
        const fallbackName = c.name.replace(/^--/, '').replace(/-/g, ' ');
        const purpose = c.purpose || fallbackName;
        if (mode === 'both') {
            return { name: c.name, purpose, light: "TO_GENERATE", dark: "TO_GENERATE" };
        } else if (mode === 'light') {
            return { name: c.name, purpose, light: "TO_GENERATE" };
        } else {
            return { name: c.name, purpose, dark: "TO_GENERATE" };
        }
    });

    // Build context from previously generated colors
    let contextSection = '';
    if (previouslyGenerated.length > 0) {
        const contextColors = previouslyGenerated.map(c => {
            if (mode === 'both') {
                return `  ${c.name}: light="${c.light}", dark="${c.dark}"`;
            } else if (mode === 'light') {
                return `  ${c.name}: light="${c.light}"`;
            } else {
                return `  ${c.name}: dark="${c.dark}"`;
            }
        }).join('\n');
        contextSection = `\nALREADY GENERATED (maintain harmony but ensure hue diversity):\n${contextColors}\n`;
    }

    const modeInstruction = mode === 'both'
        ? 'Generate BOTH "light" and "dark" values.'
        : `Generate ONLY "${mode}" values.`;

    return `Generate RGB colors for a "${creativeDirection}" theme.

CRITICAL - COLOR DIVERSITY:
Before generating, identify the FULL RANGE of colors associated with the theme:
- What are the PRIMARY colors? (dominant, defining colors)
- What are the SECONDARY colors? (supporting, environmental colors)
- What are the ACCENT colors? (highlights, details, contrast elements)
- What CONTRAST PAIRS exist? (warm vs cool, light vs dark, saturated vs muted)

You MUST use colors from AT LEAST two different hue families associated with the theme.
DO NOT generate variations of a single color family. A good palette has diversity.

${modeInstruction}
${contextSection}
COLORS TO GENERATE:
${JSON.stringify({ colors: toGenerateJson }, null, 2)}

RULES:
- Replace "TO_GENERATE" with RGB values (format: "r g b" or "r g b / alpha" like "45 120 180" or "64 64 64 / 0.5")
- If the original color definition includes alpha transparency (e.g., "/ 0.5"), you MUST preserve it in your generated value
- Alpha values range from 0.0 (fully transparent) to 1.0 (fully opaque) and are used for overlays, shadows, and translucent surfaces
- Light mode: light backgrounds, dark text
- Dark mode: dark backgrounds, light text
- Use the FULL COLOR PALETTE of the inspiration, not just the most obvious color
- Primary colors should be distinctive and thematic
- Secondary/highlight colors should provide CONTRAST (different hue families)
- Background colors can be neutral but should still evoke the theme
- Ensure sufficient contrast between text and backgrounds for readability

Return ONLY valid JSON with the colors array.`;
};
