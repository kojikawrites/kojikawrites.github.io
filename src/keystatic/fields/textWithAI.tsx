/** @jsxImportSource react */
/**
 * Custom text field with AI generate button for image-related text
 *
 * The button finds the nearest image in the component and generates text from it.
 * Supports alt text, description, and caption generation.
 */

import { fields } from '@keystatic/core';
import React from 'react';
import { ActionButton } from '@keystar/ui/button';
import { Flex } from '@keystar/ui/layout';
import { TextField } from '@keystar/ui/text-field';
import { LLMOperationModal, type LLMOperationStatus } from '../../components/editor/LLMOperationModal';

// Check if LLM is enabled via environment variable
const LLM_ENABLED = import.meta.env.PUBLIC_LLM_ENABLED === 'true';

/**
 * Helper function to convert image src to base64 for LLM API
 */
const fetchImageAsBase64 = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) {
        return src;
    }

    const response = await fetch(src);
    if (!response.ok) throw new Error(`Failed to fetch image: ${src}`);
    const blob = await response.blob();

    const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });

    return dataUrl;
};

export interface TextWithAIConfig {
    label: string;
    description?: string;
    validation?: { isRequired?: boolean; length?: { min?: number; max?: number } };
    multiline?: boolean;
    mode: 'alt' | 'description' | 'caption';
}

export const textWithAI = (config: TextWithAIConfig) => {
    // If LLM is disabled, just return a regular text field
    if (!LLM_ENABLED) {
        return fields.text({
            label: config.label,
            description: config.description,
            validation: config.validation,
            multiline: config.multiline,
        });
    }

    // Create the base text field
    const baseField = fields.text({
        label: config.label,
        description: config.description,
        validation: config.validation,
        multiline: config.multiline,
    });

    // Custom Input component with generate button that opens modal dialog
    const TextWithAIInput: React.FC<{
        value: string;
        onChange: (value: string) => void;
        autoFocus?: boolean;
        forceValidation?: boolean;
    }> = (props) => {
        const containerRef = React.useRef<HTMLDivElement>(null);

        // Modal state
        const [modalVisible, setModalVisible] = React.useState(false);
        const [modalStatus, setModalStatus] = React.useState<LLMOperationStatus>('idle');
        const [llmResult, setLlmResult] = React.useState('');
        const [llmError, setLlmError] = React.useState('');
        const [llmContext, setLlmContext] = React.useState('');
        const [imageSrc, setImageSrc] = React.useState<string | null>(null);

        // Find the image source by traversing the DOM from this component
        // This is more reliable than module-level state since it reads the actual
        // rendered image at the moment the button is clicked
        // Returns { src: string, background: 'white' | 'black' | null } to indicate
        // if the image needs a specific background color for transparency compositing
        const findImageSrcFromDOM = (): { src: string; background: 'white' | 'black' | null } | null => {
            if (!containerRef.current) return null;

            // Helper to check if an image is a content image (not an icon)
            const isContentImage = (img: HTMLImageElement): boolean => {
                // Skip robot icon
                if (img.src.includes('robot.svg')) return false;
                // Skip very small images (icons are typically < 50px)
                if (img.naturalWidth > 0 && img.naturalWidth < 50) return false;
                if (img.naturalHeight > 0 && img.naturalHeight < 50) return false;
                // Skip images inside buttons
                if (img.closest('button') || img.closest('[role="button"]')) return false;
                // Skip images with icon-related classes
                if (img.className.includes('icon') || img.className.includes('robot')) return false;
                return true;
            };

            // Helper to check if a string looks like an image path
            const looksLikeImagePath = (value: string): boolean => {
                if (!value) return false;
                // Check for common image extensions or path patterns
                return /\.(png|jpg|jpeg|gif|webp|svg|avif)$/i.test(value) ||
                       /\[THEME\]/i.test(value) || // ThemedImage pattern
                       value.startsWith('/src/') ||
                       value.startsWith('/assets/');
            };

            // Detect current theme from website settings (stored in localStorage)
            const getCurrentTheme = (): 'light' | 'dark' => {
                // Check localStorage first - this is where the website stores the theme preference
                const storedTheme = localStorage.getItem('theme');
                if (storedTheme === 'dark' || storedTheme === 'light') {
                    console.log('[textWithAI] Theme from localStorage:', storedTheme);
                    return storedTheme;
                }
                // Handle 'system' theme - resolve to actual light/dark based on browser preference
                if (storedTheme === 'system') {
                    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
                    const resolved = prefersDark ? 'dark' : 'light';
                    console.log('[textWithAI] Theme from system preference:', resolved);
                    return resolved;
                }
                // Fallback to checking CSS class on document element
                if (document.documentElement.classList.contains('theme-dark')) {
                    console.log('[textWithAI] Theme from CSS class: dark');
                    return 'dark';
                }
                // Fallback to browser preference (no localStorage set)
                const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
                const theme = prefersDark ? 'dark' : 'light';
                console.log('[textWithAI] Theme from browser preference:', theme);
                return theme;
            };

            // Traverse up to find the dialog/form container, then find the img within it
            // Keystatic renders the edit form in a dialog - look for img in parent containers
            let element: HTMLElement | null = containerRef.current;

            // Go up to find a reasonable parent container (dialog, form, or content area)
            while (element && element !== document.body) {
                // Look for all img elements within this container and find a content image
                const imgs = element.querySelectorAll('img');
                for (const img of imgs) {
                    if (img.src && isContentImage(img as HTMLImageElement)) {
                        console.log('[textWithAI] Found content image via DOM traversal:', img.src);
                        return { src: img.src, background: null };
                    }
                }

                // Also look for text inputs that might contain image paths (for ThemedImage, etc.)
                // This handles cases where the image preview is in a separate DOM tree
                const inputs = element.querySelectorAll('input[type="text"], input:not([type])');

                // First, look for labeled inputs (Dark/Light fields in ThemedImage logoSrc)
                // These take priority over the generic src field
                const currentTheme = getCurrentTheme();
                console.log('[textWithAI] Detected theme:', currentTheme);
                let darkPath: string | null = null;
                let lightPath: string | null = null;
                let genericSrcPath: string | null = null;

                for (const input of inputs) {
                    const value = (input as HTMLInputElement).value;
                    if (!looksLikeImagePath(value)) continue;

                    // Try to find the label for this input
                    const inputEl = input as HTMLInputElement;
                    const label = inputEl.id ? document.querySelector(`label[for="${inputEl.id}"]`) : null;
                    const labelText = label?.textContent?.toLowerCase() || '';

                    // Also check parent elements for label context
                    const parentText = inputEl.closest('[data-field]')?.textContent?.toLowerCase() || '';

                    if (labelText.includes('dark') || parentText.includes('dark')) {
                        darkPath = value;
                    } else if (labelText.includes('light') || parentText.includes('light')) {
                        lightPath = value;
                    } else if (value.includes('[THEME]')) {
                        genericSrcPath = value;
                    } else if (!genericSrcPath) {
                        // Fallback to any image path found
                        genericSrcPath = value;
                    }
                }

                console.log('[textWithAI] Found paths - dark:', darkPath, 'light:', lightPath, 'generic:', genericSrcPath);

                // Choose path based on current theme, with fallbacks
                // Priority: matching theme > any available theme path > generic path
                const themePreference = currentTheme === 'dark' ? [darkPath, lightPath] : [lightPath, darkPath];
                console.log('[textWithAI] Theme preference order:', themePreference);
                const selectedPath = themePreference.find(Boolean) || genericSrcPath;
                console.log('[textWithAI] Selected path:', selectedPath);

                let imagePath: string | null = null;
                let selectedTheme: 'light' | 'dark' | null = null;

                if (selectedPath) {
                    imagePath = selectedPath;
                    if (selectedPath === darkPath) {
                        selectedTheme = 'dark';
                    } else if (selectedPath === lightPath) {
                        selectedTheme = 'light';
                    } else if (selectedPath.includes('[THEME]')) {
                        // Use the current theme for [THEME] placeholder
                        selectedTheme = currentTheme;
                        imagePath = imagePath.replace('[THEME]', currentTheme);
                    }
                    console.log('[textWithAI] Using image path:', imagePath, 'theme:', selectedTheme);
                }

                if (imagePath) {
                    // Make relative paths absolute
                    if (imagePath.startsWith('/')) {
                        imagePath = window.location.origin + imagePath;
                    }
                    // For themed images, set background color MATCHING the selected theme
                    // Dark theme images are designed for dark backgrounds (have light features) -> black background
                    // Light theme images are designed for light backgrounds (have dark features) -> white background
                    const background = selectedTheme === 'dark' ? 'black' : selectedTheme === 'light' ? 'white' : null;
                    console.log('[textWithAI] Using background:', background);
                    return { src: imagePath, background };
                }

                element = element.parentElement;
            }

            return null;
        };

        // Store the background color for the current image (for themed images)
        const [imageBackground, setImageBackground] = React.useState<'white' | 'black' | null>(null);

        const handleOpenModal = () => {
            const foundImage = findImageSrcFromDOM();
            if (!foundImage) {
                alert('No image found. Please select an image first.');
                return;
            }
            setImageSrc(foundImage.src);
            setImageBackground(foundImage.background);
            setLlmContext('');
            setLlmResult('');
            setLlmError('');
            setModalStatus('idle');
            setModalVisible(true);
        };

        const callLLMAPI = async () => {
            if (!imageSrc) {
                console.log('[textWithAI] callLLMAPI: No imageSrc');
                return;
            }

            console.log('[textWithAI] callLLMAPI called');
            console.log('[textWithAI] imageSrc:', imageSrc);
            console.log('[textWithAI] imageSrc type:', typeof imageSrc);
            console.log('[textWithAI] imageSrc starts with blob:', imageSrc.startsWith('blob:'));
            console.log('[textWithAI] imageSrc starts with /:', imageSrc.startsWith('/'));
            console.log('[textWithAI] imageSrc starts with data:', imageSrc.startsWith('data:'));

            setModalStatus('loading');
            setLlmError('');

            try {
                // Use fetchImageAsBase64 which handles MIME type detection for blob URLs
                console.log('[textWithAI] Converting image to base64...');
                const imageData = await fetchImageAsBase64(imageSrc);
                console.log('[textWithAI] Base64 prefix:', imageData.substring(0, 50));

                // Call the LLM API
                const callAPI = async (image: string) => {
                    const apiResponse = await fetch('/api/llm/image-alt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image,
                            mode: config.mode,
                            context: llmContext
                        })
                    });
                    return apiResponse.json();
                };

                let data = await callAPI(imageData);

                // If unknown format error, convert via build service and retry
                if (!data.success && data.error && data.error.includes('unknown format')) {
                    console.log('[textWithAI] Converting image for LLM:');
                    console.log('[textWithAI]   Image:', imageSrc);
                    console.log('[textWithAI]   Background:', imageBackground);
                    const convertResponse = await fetch('/api/build/convert-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: imageData,
                            format: 'png',
                            max_size: 1024,
                            background: imageBackground // Pass background color for themed images
                        })
                    });

                    const convertData = await convertResponse.json();

                    if (convertData.success && convertData.image) {
                        data = await callAPI(convertData.image);
                    } else {
                        throw new Error(convertData.error || 'Image conversion failed');
                    }
                }

                if (data.success) {
                    setLlmResult(data.altText || data.result || '');
                    setModalStatus('success');
                } else {
                    throw new Error(data.error || data.validationError || 'Unknown error');
                }
            } catch (error: any) {
                setLlmError(error.message || 'Failed to generate text');
                setModalStatus('error');
            }
        };

        const handleApprove = async (result: string) => {
            try {
                await navigator.clipboard.writeText(result);
                alert('Copied to clipboard! Paste it into the field.');
            } catch (e) {
                alert(`Result: ${result}\n\nManually copy this text to the field.`);
            }
        };

        const operationLabel = config.mode === 'alt' ? 'Alt Text'
            : config.mode === 'description' ? 'Description'
            : 'Caption';

        return (
            <div ref={containerRef}>
                <Flex gap="regular" alignItems="end">
                    <div style={{ flex: 1 }}>
                        <TextField
                            label={config.label}
                            description={config.description}
                            value={props.value}
                            onChange={props.onChange}
                            autoFocus={props.autoFocus}
                            isRequired={config.validation?.isRequired}
                        />
                    </div>
                    <span className="ai-generate-btn-wrapper">
                        <ActionButton
                            aria-label={`Generate ${config.mode}`}
                            onPress={handleOpenModal}
                        >
                            <img src="/src/assets/images/admin/robot.svg" alt="AI" className="robot-icon" />
                        </ActionButton>
                    </span>
                </Flex>

                {/* LLM Operation Modal */}
                <LLMOperationModal
                    visible={modalVisible}
                    status={modalStatus}
                    operation={`Generate ${operationLabel}`}
                    result={llmResult}
                    error={llmError}
                    context={llmContext}
                    onApprove={handleApprove}
                    onContextChange={setLlmContext}
                    onClose={() => setModalVisible(false)}
                    onRetry={callLLMAPI}
                />
            </div>
        );
    };

    // Return a field that spreads the base field but overrides Input
    return {
        ...baseField,
        Input: TextWithAIInput,
    };
};