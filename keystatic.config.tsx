/** @jsxImportSource react */
// @ts-ignore
import { config, fields, collection, singleton } from '@keystatic/core';
// @ts-ignore
import { wrapper, block, inline } from '@keystatic/core/content-components';
import { categories } from './src/build/generators/categories';
import { tags } from './src/build/generators/tags';
import React from 'react';
import { getSiteCode } from "./src/lib/config/getSiteCode.ts";
import { LLMOperationModal, type LLMOperationStatus } from './src/components/editor/LLMOperationModal';
import { EditorToolbar } from './src/components/editor/EditorToolbar';
import { createPortal } from 'react-dom';
import ReactDOM from 'react-dom/client';
// Keystatic UI components for custom fields
import { ActionButton } from '@keystar/ui/button';
import { Flex } from '@keystar/ui/layout';
import { TextField } from '@keystar/ui/text-field';


// Hook to load editor styles on component mount
const useEditorStyles = () => {
    React.useEffect(() => {
        if (!document.querySelector('link[href="/css/editor-styles.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/css/editor-styles.css';
            document.head.appendChild(link);
        }
    }, []);
};

// Check if LLM is enabled via environment variable
const LLM_ENABLED = import.meta.env.PUBLIC_LLM_ENABLED === 'true';

// Universal toolbar injection via DOM observation (only if LLM is enabled)
if (typeof window !== 'undefined' && LLM_ENABLED) {
    console.log('[Keystatic Patch] Setting up DOM-based toolbar injection (LLM_ENABLED=true)...');

    let lastPathname = window.location.pathname;
    let toolbarRoot: ReturnType<typeof ReactDOM.createRoot> | null = null;
    let injectionPending = false;  // Debounce flag to prevent duplicate injections
    let injectionTimeout: ReturnType<typeof setTimeout> | null = null;

    const injectToolbarDirectly = () => {
        injectionPending = false;

        // Check if toolbar container already exists and is in DOM
        const existingContainer = document.getElementById('llm-toolbar-container');
        if (existingContainer && document.body.contains(existingContainer)) {
            return true; // Already injected
        }

        // Find Keystatic's main container
        const main = document.getElementById('keystatic-main-panel') ||
                     document.querySelector('main[data-keystatic]') ||
                     document.querySelector('main');

        if (!main) {
            return false;
        }

        // Check if we're actually in a Keystatic page
        if (!window.location.pathname.includes('/keystatic')) {
            return false;
        }

        console.log('[Keystatic Patch] ✓ Found main container, injecting toolbar...');

        // Create toolbar container
        const container = document.createElement('div');
        container.id = 'llm-toolbar-container';
        main.insertBefore(container, main.firstChild);

        // Render the toolbar using ReactDOM
        toolbarRoot = ReactDOM.createRoot(container);
        toolbarRoot.render(React.createElement(EditorToolbar));

        console.log('[Keystatic Patch] ✓ Toolbar injected successfully');
        return true;
    };

    // Debounced injection scheduler - prevents multiple rapid calls
    const scheduleInjection = (delay: number = 100) => {
        if (injectionPending) return;  // Already scheduled
        injectionPending = true;
        if (injectionTimeout) clearTimeout(injectionTimeout);
        injectionTimeout = setTimeout(injectToolbarDirectly, delay);
    };

    // Try immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            scheduleInjection(100);
        });
    } else {
        scheduleInjection(100);
    }

    // Observe for DOM changes (including client-side navigation)
    const observer = new MutationObserver(() => {
        // Check if URL changed (client-side navigation)
        if (window.location.pathname !== lastPathname) {
            lastPathname = window.location.pathname;
            // Small delay to let the new page render
            scheduleInjection(100);
            return;
        }

        // Also check if toolbar container was removed from DOM
        const existingContainer = document.getElementById('llm-toolbar-container');
        if (!existingContainer || !document.body.contains(existingContainer)) {
            scheduleInjection(100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
        lastPathname = window.location.pathname;
        scheduleInjection(100);
    });

    console.log('[Keystatic Patch] ✓ DOM observer installed');
}

// Admin link injection (always enabled, independent of LLM)
if (typeof window !== 'undefined') {
    const injectAdminLink = () => {
        // Check if we're actually in a Keystatic page
        if (!window.location.pathname.includes('/keystatic')) {
            return;
        }

        // Remove any existing admin link, divider, or container first
        const existingLink = document.getElementById('admin-back-link');
        if (existingLink) {
            existingLink.remove();
        }
        const existingDivider = document.getElementById('admin-link-divider');
        if (existingDivider) {
            existingDivider.remove();
        }
        const existingContainer = document.getElementById('admin-link-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Find the toolbar buttons area
        const buttonsArea = document.querySelector('.editor-toolbar-buttons');
        if (buttonsArea) {
            // Create link for inside toolbar
            const adminLink = document.createElement('a');
            adminLink.id = 'admin-back-link';
            adminLink.href = '/admin';
            adminLink.textContent = '← Admin';
            adminLink.style.cssText = `
                display: inline-flex;
                align-items: center;
                margin-right: 12px;
                font-size: 0.9rem;
                color: #ffffff;
                text-decoration: none;
                transition: color 0.15s ease;
            `;
            adminLink.onmouseenter = () => {
                adminLink.style.color = '#3b82f6';
            };
            adminLink.onmouseleave = () => {
                adminLink.style.color = '#ffffff';
            };

            // Create vertical divider
            const divider = document.createElement('span');
            divider.id = 'admin-link-divider';
            divider.style.cssText = `
                display: inline-flex;
                align-self: stretch;
                width: 1px;
                background: #4b5563;
                margin-right: 12px;
            `;

            buttonsArea.insertBefore(divider, buttonsArea.firstChild);
            buttonsArea.insertBefore(adminLink, buttonsArea.firstChild);
            console.log('[Keystatic Patch] ✓ Admin link injected into toolbar');
            return;
        }

        // No AI toolbar - create a minimal toolbar container with just the admin link
        const main = document.getElementById('keystatic-main-panel') ||
                     document.querySelector('main[data-keystatic]') ||
                     document.querySelector('main');
        if (main && !document.getElementById('admin-link-container')) {
            // Create container styled like the AI toolbar
            const container = document.createElement('div');
            container.id = 'admin-link-container';
            container.className = 'editor-toolbar';

            // Create buttons area styled like the AI toolbar
            const buttonsArea = document.createElement('div');
            buttonsArea.className = 'editor-toolbar-buttons';

            const adminLink = document.createElement('a');
            adminLink.id = 'admin-back-link';
            adminLink.href = '/admin';
            adminLink.textContent = '← Admin';
            adminLink.style.cssText = `
                display: inline-flex;
                align-items: center;
                font-size: 0.9rem;
                color: #ffffff;
                text-decoration: none;
                transition: color 0.15s ease;
            `;
            adminLink.onmouseenter = () => {
                adminLink.style.color = '#3b82f6';
            };
            adminLink.onmouseleave = () => {
                adminLink.style.color = '#ffffff';
            };

            buttonsArea.appendChild(adminLink);
            container.appendChild(buttonsArea);
            main.insertBefore(container, main.firstChild);
            console.log('[Keystatic Patch] ✓ Standalone admin bar created (no AI toolbar)');
        }
    };

    // Watch for the toolbar to appear and inject when it does
    const observer = new MutationObserver(() => {
        if (!window.location.pathname.includes('/keystatic')) return;

        const hasAdminLink = document.getElementById('admin-back-link');
        const toolbar = document.querySelector('.editor-toolbar-buttons');

        // If toolbar exists but admin link is not in it, re-inject
        if (toolbar && (!hasAdminLink || !toolbar.contains(hasAdminLink))) {
            injectAdminLink();
        }
        // If no toolbar and no admin link at all, create standalone
        else if (!toolbar && !hasAdminLink) {
            injectAdminLink();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial injection after short delay
    setTimeout(injectAdminLink, 200);
}

// Singleton flag to ensure only one toolbar instance
let toolbarInitialized = false;

// Component to inject toolbar into Keystatic editor
const EditorToolbarInjector: React.FC = () => {
    const [toolbarContainer, setToolbarContainer] = React.useState<HTMLElement | null>(null);
    const [isActiveInstance, setIsActiveInstance] = React.useState(false);

    useEditorStyles();

    React.useEffect(() => {
        // Only the first instance should render the toolbar
        if (toolbarInitialized) {
            return;
        }

        toolbarInitialized = true;
        setIsActiveInstance(true);

        // Find the Keystatic editor container
        const findEditorContainer = () => {
            // Look for the main content area in Keystatic
            const main = document.getElementById('keystatic-main-panel') ||
                         document.querySelector('main') ||
                         document.querySelector('[role="main"]');
            if (main) {
                // Create a container for the toolbar at the top of main
                let container = document.getElementById('llm-toolbar-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'llm-toolbar-container';
                    main.insertBefore(container, main.firstChild);
                }
                setToolbarContainer(container);
                return true;
            }
            return false;
        };

        if (!findEditorContainer()) {
            // Retry after a delay if not found immediately
            const interval = setInterval(() => {
                if (findEditorContainer()) {
                    clearInterval(interval);
                }
            }, 100);

            return () => {
                clearInterval(interval);
                toolbarInitialized = false;
            };
        }

        return () => {
            toolbarInitialized = false;
        };
    }, []);

    if (!isActiveInstance || !toolbarContainer) return null;

    return createPortal(<EditorToolbar />, toolbarContainer);
};

const github_author = import.meta.env?.PUBLIC_GITHUB_REPO_OWNER || 'unknown';
const github_repo = import.meta.env?.PUBLIC_GITHUB_REPO || 'unknown';

// ============================================================================
// LOGO MAP - Load synchronously at module level
// ============================================================================
const siteCode = getSiteCode();
// Import logo-map.json dynamically
const logoMapGlob = import.meta.glob<{ default: any }>('/src/.sites/**/state/*.json', { eager: true });
const logoMapKey = Object.keys(logoMapGlob).find(key => key.includes(`.sites/${siteCode}`) && key.includes('logo-map.json'));
const logoMap = logoMapKey ? logoMapGlob[logoMapKey].default : null;

// ============================================================================
// CONFIGURATION DIRECTORIES
// ============================================================================
const baseDir = 'src';

const basePostPath = `${baseDir}/.sites/${siteCode}/content/posts`;
const basePagePath = `${baseDir}/.sites/${siteCode}/content/pagecontent`;

const baseImagePath = `${baseDir}/.sites/${siteCode}/images`;
const blogImagePath = `${baseImagePath}/blog`;

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const commonCategoriesText = `Common categories: ${categories.join(', ')}. You can also enter a custom category.`;
const commonTagsText = `Common tags: ${tags.join(', ')}. You can also enter a custom tag.`;

// Default author from environment variable or fallback based on site
const defaultAuthor = import.meta.env?.DEFAULT_AUTHOR ||
    (typeof process !== 'undefined' && process.env?.DEFAULT_AUTHOR) ||
    (siteCode === 'hiivelabs.com' ? 'hiive' : 'admin');

// ============================================================================
// SLUG CONTEXT - Replaces global mutable state
// ============================================================================

/** Context for sharing slug state between components without global mutation */
const SlugContext = React.createContext<string>('');

/** Provider component that tracks slug from DOM and shares it via context */
const SlugProvider: React.FC<{ children: React.ReactNode; enabled: boolean }> = ({ children, enabled }) => {
    const [slug, setSlug] = React.useState<string>('');

    React.useEffect(() => {
        if (!enabled) return;

        const findSlug = (): boolean => {
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent?.includes('Slug')) {
                    const inputId = label.getAttribute('for');
                    if (inputId) {
                        const input = document.getElementById(inputId) as HTMLInputElement;
                        if (input?.value && slug !== input.value) {
                            setSlug(input.value);
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        if (!findSlug()) {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (findSlug() || attempts > 20) clearInterval(interval);
            }, 100);
            return () => clearInterval(interval);
        }
    }, [enabled, slug]);

    return <SlugContext.Provider value={slug}>{children}</SlugContext.Provider>;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Simple component factories for reducing boilerplate */
const simpleWrapper = (label: string, schema = {}) => wrapper({ label, schema });
const simpleInline = (label: string, schema = {}) => inline({ label, schema });
const simpleBlock = (label: string, schema = {}) => block({ label, schema });

const classField = () => fields.text({ label: 'Class' });

/** Extract image data from Keystatic image field */
const extractImageData = (image: any): { filename: string; previewSrc: string | null; isNewlySelected: boolean } => {
    if (typeof image === 'string') {
        return { filename: image, previewSrc: null, isNewlySelected: false };
    }

    if (typeof image === 'object') {
        const imgObj = image as any;
        const filename = imgObj.filename || imgObj.name || String(image);
        let previewSrc: string | null = null;

        // Convert binary data to Blob URL
        if (imgObj.data && (imgObj.data instanceof Uint8Array || Array.isArray(imgObj.data))) {
            try {
                const uint8Array = imgObj.data instanceof Uint8Array ? imgObj.data : new Uint8Array(imgObj.data);
                const blob = new Blob([uint8Array], { type: 'image/*' });
                previewSrc = URL.createObjectURL(blob);
            } catch (e) {
                console.error('[DEBUG] Failed to create blob URL:', e);
            }
        } else if (imgObj instanceof File) {
            previewSrc = URL.createObjectURL(imgObj);
        } else {
            previewSrc = imgObj.data || imgObj.src || imgObj.url || imgObj.preview || null;
        }

        return { filename, previewSrc, isNewlySelected: true };
    }

    return { filename: '', previewSrc: null, isNewlySelected: false };
};

/** Build image path with optional slug subdirectory */
const buildImagePath = (filename: string, baseDir: string, slug?: string): string => {
    if (filename.startsWith('/') || filename.startsWith(`${baseDir}/`)) {
        return filename;
    }
    return slug ? `${baseDir}/${slug}/${filename}` : `${baseDir}/${filename}`;
};

// ============================================================================
// IMAGE DATA STORE - Share image data between ContentView and field inputs
// ============================================================================
// React Context doesn't work because Keystatic renders ContentView and form fields
// in separate DOM trees. Use a simple module-level store instead.
// Only one image block is edited at a time, so a single value is sufficient.
// Using an object with a mutable property to avoid bundler const conversion issues.

const imageDataStore = { currentDisplaySrc: null as string | null };

// ============================================================================
// TEXT WITH AI FIELD - Custom field with generate button
// ============================================================================

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

/**
 * Call the LLM image-alt API using the shared utility
 */
const callImageAltAPI = async (imageSrc: string, mode: 'alt' | 'description' | 'caption'): Promise<string> => {
    // Import dynamically to avoid SSR issues (this is only used client-side)
    const { analyzeImage, fetchImageAsBase64 } = await import('./src/lib/client/imageAnalysis');
    const imageData = await fetchImageAsBase64(imageSrc);

    const result = await analyzeImage(imageData, { mode, context: '' });

    if (result.success && result.text) {
        return result.text;
    }
    throw new Error(result.error || 'Unknown error');
};

/**
 * Custom text field with AI generate button for image-related text
 * The button finds the nearest image in the component and generates text from it
 */
interface TextWithAIConfig {
    label: string;
    description?: string;
    validation?: { isRequired?: boolean; length?: { min?: number; max?: number } };
    multiline?: boolean;
    mode: 'alt' | 'description' | 'caption';
}

const textWithAI = (config: TextWithAIConfig) => {
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


// ============================================================================
// IMAGE CONTENT VIEW FACTORY
// ============================================================================
const createImageContentView = (options: {
    imageDirectory: string;
    includeCaption?: boolean;
    includeSlugTracking?: boolean;
    defaultAlt?: string;
}) => {
    // Inner component that consumes the slug context
    const ImageContentViewInner: React.FC<{ value: any }> = ({ value }) => {
        // Load editor styles and toolbar
        useEditorStyles();

        const { image, src, alt, caption } = value;
        const currentSlug = React.useContext(SlugContext); // Get slug from context instead of global

        // Memoize extracted image data to prevent creating new blob URLs on every render
        const extractedData = React.useMemo(() => {
            if (!image) return null;
            return extractImageData(image);
        }, [image]);

        // Determine image source
        let imageSrc: string | null = null;
        let previewSrc: string | null = null;
        let sourceInfo = '';
        let isNewlySelected = false;

        if (extractedData) {
            isNewlySelected = extractedData.isNewlySelected;
            previewSrc = extractedData.previewSrc;

            if (extractedData.filename) {
                sourceInfo = `Picker: ${extractedData.filename}${currentSlug && options.includeSlugTracking ? ` (slug: ${currentSlug})` : ''}`;
                imageSrc = buildImagePath(
                    extractedData.filename,
                    options.imageDirectory,
                    options.includeSlugTracking ? currentSlug : undefined
                );
            }
        } else if (src) {
            sourceInfo = `Manual: ${src}`;
            imageSrc = src.startsWith('/') || src.startsWith(`${baseDir}/`)
                ? src
                : `${options.imageDirectory}/${src}`;
        }

        const displaySrc = isNewlySelected && previewSrc ? previewSrc : imageSrc;

        // Update the module-level store whenever this component renders/mounts
        // This ensures textWithAI fields get the correct image when clicking the generate button
        React.useEffect(() => {
            imageDataStore.currentDisplaySrc = displaySrc;
        }, [displaySrc]);

        // Clean up blob URLs when component unmounts or previewSrc changes
        React.useEffect(() => {
            return () => {
                if (previewSrc && previewSrc.startsWith('blob:')) {
                    URL.revokeObjectURL(previewSrc);
                }
            };
        }, [previewSrc]);

        if (!imageSrc) {
            return <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                <p>No image selected</p>
            </div>;
        }

        // Placeholder for unsaved images without preview
        if (isNewlySelected && !previewSrc) {
            return (
                <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
                        {sourceInfo}
                    </div>
                    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>💾 Save document to preview image</p>
                    </div>
                    {options.includeCaption && caption && <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>{caption}</p>}
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
                        {sourceInfo}{isNewlySelected && previewSrc ? ' (preview)' : ` → ${imageSrc}`}
                    </div>
                    <img
                        src={displaySrc}
                        alt={alt || options.defaultAlt || 'Image'}
                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                    />
                    {options.includeCaption && caption && <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>{caption}</p>}
                </div>
            </div>
        );
    };

    // Return the component wrapped in SlugProvider
    return (props: any) => {
        return (
            <SlugProvider enabled={options.includeSlugTracking ?? false}>
                <ImageContentViewInner value={props.value} />
            </SlugProvider>
        );
    };
};

const createImageComponent = (type: 'Lightbox' | 'Gallery', imagePath: string, includeSlugTracking?: boolean) => {
    const isGallery = type === 'Gallery';
    const slugTracking = includeSlugTracking !== undefined ? includeSlugTracking : isGallery;

    // @ts-ignore
    // @ts-ignore
    return block({
        label: `${type} Image`,
        schema: {
            image: fields.image({
                label: 'Image (Picker)',
                directory: imagePath,
                publicPath: `/${imagePath}/`,
            }),
            src: fields.text({
                label: 'Or enter path manually',
                description: 'Legacy support - leave empty if using image picker above',
            }),
            id: fields.text({ label: 'Id'}),
            // @ts-ignore
            alt: textWithAI({
                label: 'Alt Text',
                validation: { isRequired: true },
                mode: 'alt'
            }),
            // @ts-ignore
            description: textWithAI({
                label: 'Detailed Description',
                mode: 'description'
            }),
            // @ts-ignore
            caption: textWithAI({
                label: 'Caption',
                mode: 'caption'
            })
        },
        ContentView: createImageContentView({
            imageDirectory: `/${imagePath}`,
            includeCaption: isGallery,
            includeSlugTracking: slugTracking,
            defaultAlt: `${type} image`,
        }),
    });
};

const createLightboxImageComponent = (imagePath: string, includeSlugTracking?: boolean) =>
    createImageComponent('Lightbox', imagePath, includeSlugTracking);
const createGalleryImageComponent = (imagePath: string, includeSlugTracking?: boolean) =>
    createImageComponent('Gallery', imagePath, includeSlugTracking);

// ============================================================================
// MATHJAX LOADING HOOK
// ============================================================================

/**
 * Custom hook to manage MathJax loading with proper error handling and cleanup
 * Ensures MathJax is loaded only once and handles loading failures gracefully
 */
const useMathJax = (): { loaded: boolean; error: boolean } => {
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        // Already loaded
        if ((window as any).MathJax?.typesetPromise) {
            setLoaded(true);
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.getElementById('MathJax-script');
        if (existingScript) {
            // Wait for existing script to load
            const checkInterval = setInterval(() => {
                if ((window as any).MathJax?.typesetPromise) {
                    setLoaded(true);
                    clearInterval(checkInterval);
                }
            }, 100);

            // Timeout after 10 seconds
            const timeout = setTimeout(() => {
                clearInterval(checkInterval);
                if (!(window as any).MathJax?.typesetPromise) {
                    console.error('MathJax loading timeout');
                    setError(true);
                }
            }, 10000);

            return () => {
                clearInterval(checkInterval);
                clearTimeout(timeout);
            };
        }

        // Configure MathJax before loading
        (window as any).MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']]
            },
            svg: {
                fontCache: 'global'
            },
            startup: {
                ready: () => {
                    (window as any).MathJax.startup.defaultReady();
                    setLoaded(true);
                }
            }
        };

        // Load MathJax script
        const script = document.createElement('script');
        script.src = '/scripts/prebuilt/mathjax-tex-svg-full.js';
        script.async = true;
        script.id = 'MathJax-script';

        script.onload = () => {
            // Loaded flag will be set by MathJax startup.ready callback
        };

        script.onerror = (e) => {
            console.error('Failed to load MathJax script:', e);
            setError(true);
        };

        document.head.appendChild(script);

        // Cleanup is intentionally not removing the script as it should persist
        // across component unmounts for other components to use
    }, []);

    return { loaded, error };
};

// ============================================================================
// MINIMAL HTML COMPONENT DEFINITIONS
// ============================================================================
// Note: We only define HTML elements that appear in existing MDX files
// to prevent Keystatic parser errors. These are minimal definitions.
const minimalHtmlComponents = {
    // Note: span must be multiline format in Keystatic:
    // <span>
    //   content here
    // </span>
    // Single-line <span>text</span> won't work - it's treated as inline JSX

    // Wrapper elements (require multiline format)
    span: simpleWrapper('Span', {
        id: fields.text({ label: 'Id' }),
        class: classField(),
        style: fields.text({ label: 'Style' }),
    }),
    p: simpleWrapper('Paragraph', {
        id: fields.text({ label: 'Id' }),
        class: classField(),
        style: fields.text({ label: 'Style' }),
    }),
    a: simpleWrapper('Link', {
        id: fields.text({ label: 'Id' }),
        href: fields.url({ label: 'Url' }),
        target: fields.url({ label: 'Target' }),
        class: classField(),
        style: fields.text({ label: 'Style' }),
    }),
    div: simpleWrapper('Div', {
        id: fields.text({ label: 'Id' }),
        class: classField(),
        slot: fields.text({ label: 'Slot' }),
        style: fields.text({ label: 'Style' }),
    }),
    // Block elements
    br: simpleBlock('Line Break'),
    hr: simpleBlock('Horizontal Rule'),
    // Inline elements for text styling (can't have children, use text field instead)
    InlineSpan: inline({
        label: 'Inline Span',
        schema: {
            text: fields.text({ label: 'Text' }),
            id: fields.text({ label: 'Id' }),
            class: classField(),
            style: fields.text({ label: 'Style' })
        },
        ContentView: (props) => (
            <span
                className={props.value.class || ''}
                style={{
                    padding: '2px 4px',
                    backgroundColor: 'var(--ks-color-scale-slate3)',
                    borderRadius: '2px',
                    fontFamily: 'monospace',
                    fontSize: '0.95em'
                }}
            >
        {props.value.text || '(no text)'}
      </span>
        ),
    }),
    EquationSnippet: inline({
        label: 'Equation',
        schema: {
            equation: fields.text({
                label: 'Equation',
                description: 'LaTeX equation (e.g., $\\alpha$ or $x \\in \\set{k|t}$)',
                multiline: false,
            }),
            inline: fields.checkbox({
                label: 'Inline?',
                description: 'Check for inline equation (equation-snippet), uncheck for block equation (equation)',
                defaultValue: true,
            }),
            style: fields.text({
                label: 'CSS Style',
                description: 'Optional CSS style. Only applies to inline equations.',
            }),
        },
        ContentView: (props) => {
            const isInline = props.value.inline ?? true;
            const equation = props.value.equation ? `$${props.value.equation}$` :  '(no equation)';
            const containerRef = React.useRef<HTMLDivElement>(null);
            const { loaded, error } = useMathJax();

            React.useEffect(() => {
                if (!loaded || error || !containerRef.current) return;

                const typeset = async () => {
                    try {
                        if ((window as any).MathJax?.typesetPromise) {
                            await (window as any).MathJax.typesetPromise([containerRef.current]);
                        }
                    } catch (err) {
                        console.error('MathJax typeset failed:', err);
                    }
                };

                typeset();
            }, [equation, isInline, loaded, error]);

            return (
                <div
                    ref={containerRef}
                    style={{
                        padding: isInline ? '2px 4px' : '8px 12px',
                        backgroundColor: 'var(--ks-color-scale-purple3)',
                        borderRadius: '3px',
                        color: 'var(--ks-color-scale-purple11)',
                        border: '1px solid var(--ks-color-scale-purple6)',
                        display: isInline ? 'inline-block' : 'block',
                        textAlign: isInline ? 'left' : 'center',
                        verticalAlign: 'middle'
                    }}
                >
                    {isInline ? '' : '📐 '}
                    {equation}
                </div>
            );
        },
    }),
};

// ============================================================================
// SHARED CUSTOM COMPONENTS
// ============================================================================
const sharedCustomComponents = {
    FootnoteRef: inline({
        label: 'Footnote Reference',
        schema: {
            id: fields.text({
                label: 'Footnote ID',
                description: 'The footnote number or identifier (e.g., "1", "2", "a")',
            }),
        },
        ContentView: (props) => (
            <sup style={{ color: 'var(--ks-color-scale-blue9)', fontWeight: 'bold' }}>
                [{props.value.id || '?'}]
            </sup>
        ),
    }),
    FootnoteDefinition: wrapper({
        label: 'Footnote Definition',
        schema: {
            id: fields.text({
                label: 'Footnote ID',
                description: 'Must match the reference ID (e.g., "1", "2", "a")',
            }),
        },
        ContentView: (props) => {
            const ref = React.useRef<HTMLDivElement>(null);

            React.useEffect(() => {
                if (ref.current) {
                    // Navigate DOM: ref -> parent -> parent -> firstChild -> firstChild to reach header
                    const footnoteHeader = ref.current.parentElement?.parentElement?.firstElementChild?.firstElementChild as HTMLDivElement;
                    if (footnoteHeader) {
                        footnoteHeader.innerText = `FOOTNOTE DEFINITION: [${props.value.id || '?'}]`;
                    }
                }
            }, [props.value.id]);

            return (
                <div ref={ref} style={{
                    padding: '12px',
                    color: 'var(--ks-color-scale-slate12)',
                    paddingLeft: '20px',
                    borderLeft: '3px solid var(--ks-color-scale-blue9)'
                }}>
                    {props.children}
                </div>
            );
        },
    }),
    Biography: wrapper({
        label: 'Biography',
        schema: {
            id: fields.text({
                label: 'ID',
                validation: { isRequired: true },
            }),
            alt: fields.text({
                label: 'Alt Text',
            }),
            image: fields.image({
                label: 'Portrait Image',
                directory: baseImagePath,
                publicPath: `/${baseImagePath}/`,
            }),
            src: fields.text({
                label: 'Or enter path manually',
                description: 'Legacy support - leave empty if using image picker above',
            }),
        },
        ContentView: (props) => {
            // Inner component that uses slug context
            const BiographyContentViewInner: React.FC<{ value: any; children: React.ReactNode }> = ({ value, children }) => {
                const { id, alt, image, src } = value;
                const currentSlug = React.useContext(SlugContext);

                // Memoize extracted image data to prevent creating new blob URLs on every render
                const extractedData = React.useMemo(() => {
                    if (!image) return null;
                    return extractImageData(image);
                }, [image]);

                // Determine image source
                let imageSrc: string | null = null;
                let previewSrc: string | null = null;
                let sourceInfo = '';
                let isNewlySelected = false;

                if (extractedData) {
                    isNewlySelected = extractedData.isNewlySelected;
                    previewSrc = extractedData.previewSrc;

                    if (extractedData.filename) {
                        sourceInfo = `Picker: ${extractedData.filename}${currentSlug ? ` (slug: ${currentSlug})` : ''}`;
                        imageSrc = buildImagePath(extractedData.filename, `/${baseImagePath}`, currentSlug);
                    }
                } else if (src) {
                    sourceInfo = `Manual: ${src}`;
                    imageSrc = src.startsWith('/') || src.startsWith(`${baseDir}/`)
                        ? src
                        : `/${baseImagePath}/${src}`;
                }

                // Clean up blob URLs when component unmounts or previewSrc changes
                React.useEffect(() => {
                    return () => {
                        if (previewSrc && previewSrc.startsWith('blob:')) {
                            URL.revokeObjectURL(previewSrc);
                        }
                    };
                }, [previewSrc]);

                const displaySrc = isNewlySelected && previewSrc ? previewSrc : imageSrc;

                return (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                            <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
                                👤 Biography: {id || 'Untitled'}
                            </div>
                            {displaySrc ? (
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--ks-color-scale-slate11)', marginBottom: '4px', fontFamily: 'monospace' }}>
                                        {sourceInfo}{isNewlySelected && previewSrc ? ' (preview)' : ` → ${imageSrc}`}
                                    </div>
                                    <img
                                        src={displaySrc}
                                        alt={alt || id || 'Portrait'}
                                        style={{ maxWidth: '200px', maxHeight: '200px', height: 'auto', display: 'block', border: '2px solid currentColor', color: 'var(--ks-color-scale-slate11)' }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                                    />
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--ks-color-scale-slate3)', borderRadius: '4px', marginBottom: '8px' }}>
                                    <p style={{ margin: '0', color: 'var(--ks-color-scale-slate11)', fontSize: '14px' }}>📷 No portrait image selected</p>
                                </div>
                            )}
                            <div style={{ fontSize: '11px', color: 'var(--ks-color-scale-slate11)' }}>
                                <div><strong>ID:</strong> {id || '(none)'}</div>
                                {alt && <div><strong>Alt:</strong> {alt}</div>}
                                {imageSrc && <div><strong>Image:</strong> <code style={{ backgroundColor: 'var(--ks-color-scale-slate3)', color: 'var(--ks-color-scale-slate12)', padding: '2px 4px', borderRadius: '2px', fontSize: '10px' }}>{imageSrc}</code></div>}
                            </div>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            {children}
                        </div>
                    </div>
                );
            };

            return (
                <SlugProvider enabled={true}>
                    <BiographyContentViewInner value={props.value} children={props.children} />
                </SlugProvider>
            );
        },
    }),
    Thanks: wrapper({
        label: 'Thanks',
        schema: {
            name: fields.text({
                label: 'Name',
                validation: { isRequired: true },
            }),
            url: fields.text({
                label: 'URL',
            }),
        },
    }),
    PublicDownloadLink: inline({
        label: 'Download Link',
        schema: {
            filePath: fields.file({
                label: 'File to Download',
                description: 'Select the file to make downloadable.',
                directory: `${baseDir}/.sites/${siteCode}/_public/files`,
                publicPath: `/files/`,
            }),
            text: fields.text({
                label: 'Link Text',
                description: 'Text to display for the download link',
            }),
            class: classField(),
        },
        ContentView: (props) => {
            const PublicDownloadLinkInner: React.FC<{ value: any }> = ({ value }) => {
                const { filePath, text } = value;

                let fileName = '';

                if (filePath) {
                    if (typeof filePath === 'string') {
                        fileName = filePath.split('/').pop() || '';
                    } else if (filePath.filename) {
                        fileName = filePath.filename;
                    }
                }

                const hasFile = !!fileName;
                const displayText = text
                    ? hasFile
                        ? `${text} (${fileName})`
                        : `${text} (No File Selected!)})`
                    : (fileName || 'No file selected');


                return (
                    <span style={{
                        padding: '2px 6px',
                        textDecoration: hasFile ? 'underline' : 'none',
                        backgroundColor: 'var(--ks-color-scale-slate2)',
                        borderRadius: '3px',
                        color: 'var(--ks-color-scale-slate12)',
                        border: hasFile ? '1px solid var(--ks-color-se-blue6)' : '2px solid red',
                        fontFamily: 'monospace',
                        fontSize: '0.85em',
                        cursor: 'pointer'
                    }}>
                      {hasFile ? '📎' : '⚠️'} {displayText}
                  </span>
                );
            };

            return (
                <SlugProvider enabled={true}>
                    <PublicDownloadLinkInner value={props.value} />
                </SlugProvider>
            );
        },
    }),
    Timeline: simpleWrapper('Timeline'),
    TimelineEntry: wrapper({
        label: 'Timeline Entry',
        schema: {
            date: fields.text({ label: 'Timeline Date (in plaintext)' })
        },
        ContentView: (props) => {
            const ref = React.useRef<HTMLDivElement>(null);

            React.useEffect(() => {
                if (ref.current) {
                    // Navigate DOM: ref -> parent -> parent -> firstChild -> firstChild to reach header
                    const timelineHeader = ref.current.parentElement?.parentElement?.firstElementChild?.firstElementChild as HTMLDivElement;
                    if (timelineHeader) {
                        timelineHeader.innerText = `TIMELINE ENTRY: [${props.value.date || '?'}]`;
                    }
                }
            }, [props.value.date]);

            return (
                <div ref={ref} style={{
                    padding: '12px',
                    color: 'var(--ks-color-scale-slate12)',
                    paddingLeft: '20px',
                    borderLeft: '3px solid var(--ks-color-scale-blue9)'
                }}>
                    {props.children}
                </div>
            );
        },
    }),
    HiiveLabsText: inline({
        label: 'Hiive Labs Text',
        schema: {},
        ContentView: () => (
            <span>
        h<span style={{ color: '#FF8C00', fontWeight: '600' }}>i</span>ive
        <span style={{ color: '#FF8C00', fontWeight: '600' }}>labs</span>
      </span>
        ),
    }),
    EmbeddedYouTube: block({
        label: 'Embedded YouTube',
        schema: {
            youtubeId: fields.text({ label: 'YouTube ID' }),
            caption: fields.text({ label: 'Caption' }),
        },
        ContentView: (props) => {
            const { youtubeId, caption } = props.value;
            const [isPlaying, setIsPlaying] = React.useState(false);

            if (!youtubeId) {
                return (
                    <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                        <p>No YouTube ID specified</p>
                    </div>
                );
            }

            const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
            const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;

            return (
                <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                    <div
                        onClick={() => setIsPlaying(!isPlaying)}
                        style={{
                            fontSize: '10px',
                            color: 'var(--ks-color-scale-slate11)',
                            marginBottom: '8px',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            backgroundColor: isPlaying ? 'var(--ks-color-scale-blue3)' : 'transparent',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isPlaying) e.currentTarget.style.backgroundColor = 'var(--ks-color-scale-slate3)';
                        }}
                        onMouseLeave={(e) => {
                            if (!isPlaying) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>{isPlaying ? '⏸️' : '▶️'}</span>
                        YouTube: <span style={{ color: 'var(--ks-color-scale-blue9)' }}>{youtubeId}</span>
                    </div>
                    {isPlaying ? (
                        <iframe
                            src={embedUrl}
                            style={{
                                width: '100%',
                                maxWidth: '480px',
                                aspectRatio: '16 / 9',
                                border: 'none',
                                borderRadius: '4px'
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <img
                            src={thumbnailUrl}
                            alt={`YouTube video ${youtubeId}`}
                            onClick={() => setIsPlaying(true)}
                            style={{
                                width: '100%',
                                maxWidth: '480px',
                                height: 'auto',
                                display: 'block',
                                borderRadius: '4px',
                                border: '1px solid var(--ks-color-scale-slate6)',
                                cursor: 'pointer'
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                // @ts-ignore
                                (e.target as HTMLImageElement).parentElement!.innerHTML += '<p style="color: var(--ks-color-scale-slate11); font-style: italic;">Thumbnail not available</p>';
                            }}
                        />
                    )}
                    {caption && (
                        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ks-color-scale-slate12)', fontStyle: 'italic' }}>
                            {caption}
                        </p>
                    )}
                </div>
            );
        },
    }),
    MainLogo: block({
        label: 'Main Logo',
        schema: {},
        ContentView: () => {
            // Get logo sources from logo-map.json
            const lightLogoSrc = logoMap?.light?.default?.src || `/${baseImagePath}/logos/default-logo-light.svg`;
            const darkLogoSrc = logoMap?.dark?.default?.src || `/${baseImagePath}/logos/default-logo-dark.svg`;
            const lightLogoAlt = logoMap?.light?.default?.alt || 'Main logo (light)';
            const darkLogoAlt = logoMap?.dark?.default?.alt || 'Main logo (dark)';

            return (
                <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
                        🏢 Main Logo ({siteCode})
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Light theme</div>
                            <img
                                src={lightLogoSrc}
                                alt={lightLogoAlt}
                                style={{ maxWidth: '100%', height: 'auto', display: 'block', backgroundColor: '#fff', padding: '8px' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>Dark theme</div>
                            <img
                                src={darkLogoSrc}
                                alt={darkLogoAlt}
                                style={{ maxWidth: '100%', height: 'auto', display: 'block', backgroundColor: '#000', padding: '8px' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                            />
                        </div>
                    </div>
                </div>
            );
        },
    }),
    ThemedImage: block({
        label: 'Themed Image',
        schema: {
            id: fields.text({ label: 'Id' }),
            class: classField(),
            logoSrc: fields.object(
                {
                    dark: fields.text({ label: 'Dark' }),
                    light: fields.text({ label: 'Light' }),
                }
            ),
            src: fields.text({
                label: 'Source',
                description: 'Path with [THEME] placeholder (e.g., /path/logo-[THEME].png)',
            }),
            // @ts-ignore
            alt: textWithAI({ label: 'Alt Text', mode: 'alt' }),
        },
        ContentView: (props) => {
            const { src, alt } = props.value;

            // Replace [THEME] with actual theme values
            const lightSrc = src && src.includes('[THEME]') ? src.replace('[THEME]', 'light') : src;
            const darkSrc = src && src.includes('[THEME]') ? src.replace('[THEME]', 'dark') : src;

            if (!src) {
                return <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                    <p>No themed image source specified</p>
                </div>;
            }

            return (
                <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
                        Themed Image: {src}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                                Light theme
                            </div>
                            <img
                                src={lightSrc}
                                alt={alt || 'Themed image (light)'}
                                style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', width: 'auto', display: 'block', border: '1px solid #ddd', backgroundColor: '#fff', padding: '8px', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                                Dark theme
                            </div>
                            <img
                                src={darkSrc}
                                alt={alt || 'Themed image (dark)'}
                                style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', width: 'auto', display: 'block', border: '1px solid #ddd', backgroundColor: '#000', padding: '8px', objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                            />
                        </div>
                    </div>
                </div>
            );
        },
    }),
    ContentWarning: wrapper({
        label: 'Content Warning',
        schema: {
            warning: fields.text({
                label: 'Warning Text',
                description: 'Warning message to display',
                validation: { isRequired: true },
            }),
        },
        ContentView: (props) => {
            const ref = React.useRef<HTMLDivElement>(null);

            React.useEffect(() => {
                if (ref.current) {
                    // Navigate DOM to update header
                    const warningHeader = ref.current.parentElement?.parentElement?.firstElementChild?.firstElementChild as HTMLDivElement;
                    if (warningHeader && props.value.warning?.length || 0 > 0) {
                        const prefix =
                            (props.value.warning?.toUpperCase().startsWith("CONTENT WARNING:") || false)
                                ? ""
                                : "CONTENT WARNING: ";
                        warningHeader.innerText = `${prefix}${props.value.warning || '(no warning text)'}`;
                    }
                }
            }, [props.value.warning]);

            return (
                <div ref={ref} style={{
                    padding: '12px',
                    color: 'var(--ks-color-scale-slate12)',
                    paddingLeft: '20px',
                    borderLeft: '3px solid var(--ks-color-scale-orange9)',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)'
                }}>
                    <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--ks-color-scale-slate6)' }}>
                        {props.children}
                    </div>
                </div>
            );
        },
    }),
    LightboxGallery: simpleWrapper('Lightbox Gallery', {
        caption: fields.text({ label: 'Caption' })
    }),
    FormattedDate: inline({
        label: 'Formatted Date',
        schema: {
            date: fields.date({ label: 'Date' }),
        },
        ContentView: (props) => {
            const dateStr = 'Formatted Date: ' + props.value.date
                ? new Date(props.value.date).toLocaleDateString()
                : '(no date)';
            return (
                <span style={{
                    padding: '2px 6px',
                    backgroundColor: 'var(--ks-color-scale-slate3)',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '0.9em'
                }}>
          📅 {dateStr}
        </span>
            );
        },
    }),
    LightboxImage: createLightboxImageComponent(blogImagePath),
    GalleryImage: createGalleryImageComponent(blogImagePath),
    LightboxVideo: block({
        label: 'Lightbox Video',
        schema: {
            video: fields.file({
                label: 'Video File',
                description: 'Select video file (mp4, webm, etc.)',
                directory: blogImagePath,
                publicPath: `/${blogImagePath}/`,
                validation: { isRequired: true },
            }),
            inlineImg: fields.image({
                label: 'Inline Thumbnail',
                description: 'Thumbnail image shown inline in the post',
                directory: blogImagePath,
                publicPath: `/${blogImagePath}/`,
                validation: { isRequired: true },
            }),
            previewImg: fields.image({
                label: 'Preview Image',
                description: 'Preview image shown in lightbox before video plays',
                directory: blogImagePath,
                publicPath: `/${blogImagePath}/`,
                validation: { isRequired: true },
            }),
            alt: fields.text({
                label: 'Alt Text',
                description: 'Descriptive text for accessibility',
                validation: { isRequired: true },
            }),
            id: fields.text({
                label: 'ID',
                description: 'Optional HTML ID for the video element',
            }),
            description: fields.text({
                label: 'Description',
                description: 'Detailed description shown in lightbox',
                multiline: true,
            }),
            caption: fields.text({
                label: 'Caption',
                description: 'Caption shown below the inline image',
            }),
            class: fields.text({
                label: 'CSS Class',
                description: 'Optional CSS classes for styling',
            }),
        },
        ContentView: (props) => {
            const { video, inlineImg, previewImg, alt, caption } = props.value;
            const currentSlug = React.useContext(SlugContext);

            // Extract video source
            let videoSrc: string | null = null;
            if (video) {
                if (typeof video === 'string') {
                    videoSrc = video;
                } else if (video.filename) {
                    videoSrc = buildImagePath(video.filename, `/${blogImagePath}`, currentSlug);
                }
            }

            // Memoize extracted image data to prevent creating new blob URLs on every render
            const inlineExtracted = React.useMemo(() => {
                if (!inlineImg) return null;
                return extractImageData(inlineImg);
            }, [inlineImg]);

            const previewExtracted = React.useMemo(() => {
                if (!previewImg) return null;
                return extractImageData(previewImg);
            }, [previewImg]);

            // Extract inline image source
            let inlineImageSrc: string | null = null;
            let inlinePreviewSrc: string | null = null;
            let inlineIsNew = false;

            if (inlineExtracted) {
                inlineIsNew = inlineExtracted.isNewlySelected;
                inlinePreviewSrc = inlineExtracted.previewSrc;
                if (inlineExtracted.filename) {
                    inlineImageSrc = buildImagePath(inlineExtracted.filename, `/${blogImagePath}`, currentSlug);
                }
            }

            // Extract preview image source
            let previewImageSrc: string | null = null;
            let previewPreviewSrc: string | null = null;

            if (previewExtracted) {
                previewPreviewSrc = previewExtracted.previewSrc;
                if (previewExtracted.filename) {
                    previewImageSrc = buildImagePath(previewExtracted.filename, `/${blogImagePath}`, currentSlug);
                }
            }

            // Cleanup blob URLs
            React.useEffect(() => {
                return () => {
                    if (inlinePreviewSrc && inlinePreviewSrc.startsWith('blob:')) {
                        URL.revokeObjectURL(inlinePreviewSrc);
                    }
                    if (previewPreviewSrc && previewPreviewSrc.startsWith('blob:')) {
                        URL.revokeObjectURL(previewPreviewSrc);
                    }
                };
            }, [inlinePreviewSrc, previewPreviewSrc]);

            const displayInlineSrc = inlineIsNew && inlinePreviewSrc ? inlinePreviewSrc : inlineImageSrc;

            if (!videoSrc || !inlineImageSrc || !previewImageSrc || !alt) {
                return (
                    <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
                        <p>⚠️ Missing required fields. Please fill in:</p>
                        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                            {!videoSrc && <li>Video File</li>}
                            {!inlineImageSrc && <li>Inline Thumbnail</li>}
                            {!previewImageSrc && <li>Preview Image</li>}
                            {!alt && <li>Alt Text</li>}
                        </ul>
                    </div>
                );
            }

            return (
                <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
                        🎥 Lightbox Video: {videoSrc.split('/').pop()}
                    </div>

                    {/* Show inline image preview */}
                    <div style={{ marginBottom: '8px' }}>
                        <img
                            src={displayInlineSrc}
                            alt={alt}
                            style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', display: 'block', border: '2px solid currentColor' }}
                            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
                        />
                    </div>

                    <div style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--ks-color-scale-slate11)' }}>
                        <div>
                            <strong>Video:</strong> <code style={{ backgroundColor: 'var(--ks-color-scale-slate3)', color: 'var(--ks-color-scale-slate12)', padding: '2px 4px', borderRadius: '2px', fontSize: '10px' }}>{videoSrc}</code>
                        </div>
                        <div>
                            <strong>Inline:</strong> <code style={{ backgroundColor: 'var(--ks-color-scale-slate3)', color: 'var(--ks-color-scale-slate12)', padding: '2px 4px', borderRadius: '2px', fontSize: '10px' }}>{inlineImageSrc}</code>
                        </div>
                        <div>
                            <strong>Preview:</strong> <code style={{ backgroundColor: 'var(--ks-color-scale-slate3)', color: 'var(--ks-color-scale-slate12)', padding: '2px 4px', borderRadius: '2px', fontSize: '10px' }}>{previewImageSrc}</code>
                        </div>
                        <div>
                            <strong>Alt:</strong> {alt}
                        </div>
                        {caption && (
                            <div>
                                <strong>Caption:</strong> {caption}
                            </div>
                        )}
                    </div>
                </div>
            );
        },
    }),
};

// ============================================================================
// BLOG-SPECIFIC CUSTOM COMPONENTS
// ============================================================================
const blogSpecificComponents = {
};

// ============================================================================
// COMPONENT COLLECTIONS WITH AUTO-INJECTED TOOLBAR
// ============================================================================
// Wrap all components to auto-inject the toolbar (singleton pattern ensures only one renders)
// Only injects toolbar when LLM_ENABLED is true
const wrapComponentsWithToolbar = (components: any) => {
    // If LLM is disabled, return components unchanged (no toolbar injection)
    if (!LLM_ENABLED) {
        return components;
    }

    const wrapped: any = {};
    for (const [key, component] of Object.entries(components)) {
        const original = component as any;

        // Skip if no ContentView to wrap
        if (!original.ContentView) {
            wrapped[key] = original;
            continue;
        }

        // Wrap the ContentView to also render toolbar injector
        wrapped[key] = {
            ...original,
            ContentView: (props: any) => (
                <>
                    <EditorToolbarInjector />
                    {React.createElement(original.ContentView, props)}
                </>
            ),
        };
    }
    return wrapped;
};

const blogComponents = wrapComponentsWithToolbar({
    ...minimalHtmlComponents,
    ...sharedCustomComponents,
});

const pageComponents = wrapComponentsWithToolbar({
    ...minimalHtmlComponents,
    ...sharedCustomComponents,
});

// ============================================================================
// SHARED SCHEMA FACTORY
// ============================================================================
const createPostSchema = (imageDirectory: string) => ({
    title: fields.slug({
        name: {
            label: 'Title',
            validation: { isRequired: true },
        },
        slug: {
            label: 'Slug',
            description: 'Must follow pattern: YYYY-MM-DD-slug-text (e.g., 2025-06-01-my-post)',
            generate: (name: string) => {
                // Get today's date prefix
                const today = new Date();
                const datePrefix = today.toISOString().slice(0, 10); // YYYY-MM-DD
                // Use Keystatic's default slugification, then prefix with date
                const defaultSlug = name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                return defaultSlug ? `${datePrefix}-${defaultSlug}` : '';
            },
            validation: {
                // @ts-ignore
                isRequired: true,
                pattern: {
                    regex: /^\d{4}-\d{2}-\d{2}-.+$/,
                    message: 'Slug must start with a date in YYYY-MM-DD format followed by a dash and slug text',
                },
            },
        },
    }),
    author: fields.text({
        label: 'Author',
        defaultValue: defaultAuthor,
    }),
    description: fields.text({
        label: 'Description',
        multiline: true,
        validation: { isRequired: true },
    }),
    thumbnail:  fields.image({
        label: 'Thumbnail',
        directory: imageDirectory,
        publicPath: `/${imageDirectory}/`,
    }),
    content: fields.mdx({
        label: 'Content',
        options: {
            image: {
                directory: imageDirectory,
                publicPath: `${imageDirectory}/`,
            },
        },
        components: blogComponents,
    }),
    categories: fields.array(
        fields.text({
            label: 'Category',
            description: commonCategoriesText,
        }),
        {
            label: 'Categories',
            itemLabel: props => props.value || 'Category',
            validation: { length: { min: 1 } },
        }
    ),
    tags: fields.array(
        fields.text({
            label: 'Tag',
            description: commonTagsText,
        }),
        {
            label: 'Tags',
            itemLabel: props => props.value || 'Tag',
        }
    ),
});

// ============================================================================
// MAIN CONFIG
// ============================================================================
export default config({
    storage: {
        kind: process.env.NODE_ENV === 'development' ? 'local' : 'github',
        repo: {
            owner: github_author,
            name: github_repo,
        },
    },

    collections: {
        posts: collection({
            label: 'Blog Posts',
            slugField: 'title',
            path: `${basePostPath}/*`,
            format: { contentField: 'content' },
            entryLayout: 'content',
            schema: createPostSchema(blogImagePath),
        }),

        drafts: collection({
            label: 'Draft Blog Posts',
            // description: 'Posts dated today or earlier will be published within 24 hours. Posts with future dates will be published on the specified date.',
            slugField: 'title',
            path: `${basePostPath}/_drafts/*`,
            format: { contentField: 'content', data: 'json' },
            entryLayout: 'content',
            schema: createPostSchema(blogImagePath),
        }),

        pages: collection({
            label: 'Pages',
            slugField: 'title',
            path: `${basePagePath}/**`,
            format: { contentField: 'content' },
            entryLayout: 'content',
            schema: {
                title: fields.slug({
                    name: {
                        label: 'Title',
                        validation: { isRequired: true },
                    }
                }),
                description: fields.text({
                    label: 'Description',
                    validation: { isRequired: true },
                }),
                showInMenu: fields.checkbox({
                    label: 'Show in Navigation Menu',
                    defaultValue: false,
                }),
                menuLabel: fields.text({
                    label: 'Menu Label',
                    description: 'Leave empty to use page title',
                }),
                menuPosition: fields.select({
                    label: 'Menu Position',
                    options: [
                        { label: 'None', value: 'none' },
                        { label: 'Left Navigation', value: 'left' },
                        { label: 'Right Navigation', value: 'right' },
                    ],
                    defaultValue: 'none',
                }),
                menuOrder: fields.number({
                    label: 'Menu Order',
                    description: 'Lower numbers appear first (e.g., 1, 2, 3...)',
                    defaultValue: 999,
                }),
                content: fields.mdx({
                    label: 'Content',
                    options: {
                        image: {
                            directory: `${baseImagePath}`,
                            publicPath: `/${baseImagePath}/`,
                        },
                    },
                    components: pageComponents,
                }),
            },
        }),
    },
    singletons: {
        systemMenuItems: singleton({
            label: 'System Menu Items',
            path: `src/.sites/${siteCode}/state/system-menu-items`,
            format: { data: 'json' },
            schema: {
                items: fields.array(
                    fields.object({
                        href: fields.text({
                            label: 'URL',
                            validation: { isRequired: true },
                        }),
                        label: fields.text({
                            label: 'Label',
                            validation: { isRequired: true },
                        }),
                        position: fields.select({
                            label: 'Position',
                            options: [
                                { label: 'Left Navigation', value: 'left' },
                                { label: 'Right Navigation', value: 'right' },
                            ],
                            defaultValue: 'left',
                        }),
                        order: fields.number({
                            label: 'Menu Order',
                            defaultValue: 1,
                        }),
                    }),
                    {
                        label: 'System Menu Items',
                        itemLabel: (props) => props.fields.label.value || 'Menu Item',
                    }
                ),
            },
        }),
    },
});
