/** @jsxImportSource react */
// @ts-ignore
import { config, fields, collection, singleton } from '@keystatic/core';
// @ts-ignore
import { wrapper, block, inline } from '@keystatic/core/content-components';
import { categories } from './src/build/generators/categories';
import { tags } from './src/build/generators/tags';
import React from 'react';
import { getSiteCode } from "./src/lib/config/getSiteCode.ts";

import { EditorToolbar } from './src/components/editor/EditorToolbar';
import { createPortal } from 'react-dom';
import ReactDOM from 'react-dom/client';
import { createImageWithTextComponent } from './src/keystatic/ImageWithText.tsx';
import { textWithAI } from './src/keystatic/fields/textWithAI';

// Extracted Keystatic components
import { FootnoteDefinition } from './src/keystatic/footnote/FootnoteDefinition';
import { Biography } from './src/keystatic/about/Biography';
import { Thanks } from './src/keystatic/about/Thanks';
import { Timeline, TimelineEntry } from './src/keystatic/timeline/TimelineEntry';
import { EmbeddedYouTube } from './src/keystatic/EmbeddedYouTube';
import { MainLogo } from './src/keystatic/MainLogo';
import { ThemedImage } from './src/keystatic/ThemedImage';
import { ContentWarning } from './src/keystatic/posts/ContentWarning';
import { createLightboxVideoComponent } from './src/keystatic/gallery/LightboxVideo';
import { createLightboxImageComponent, createGalleryImageComponent } from './src/keystatic/gallery/LightboxImage';


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
console.log('[Keystatic Config] siteCode:', siteCode, '| SITE:', import.meta.env?.SITE);
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
            const rawEquation = props.value.equation || '';
            const containerRef = React.useRef<HTMLSpanElement>(null);
            const mathContainerRef = React.useRef<HTMLSpanElement>(null);
            const { loaded, error } = useMathJax();

            // Use useLayoutEffect to synchronously update before browser paint
            // This prevents Slate from seeing intermediate DOM states
            React.useLayoutEffect(() => {
                if (!loaded || error || !mathContainerRef.current) return;

                const mathContainer = mathContainerRef.current;
                const equation = rawEquation ? `$${rawEquation}$` : '(no equation)';

                // Clear and set content synchronously
                mathContainer.textContent = equation;

                // Typeset after a microtask to let React finish
                queueMicrotask(async () => {
                    try {
                        if ((window as any).MathJax?.typesetPromise && mathContainerRef.current) {
                            await (window as any).MathJax.typesetPromise([mathContainerRef.current]);
                        }
                    } catch (err) {
                        console.error('MathJax typeset failed:', err);
                    }
                });
            }, [rawEquation, loaded, error]);

            // Always render as inline in the editor to avoid Slate DOM errors
            // The 'inline' toggle only affects the final rendered page
            // Use contentEditable={false} to prevent Slate from tracking inner DOM changes
            return (
                <span
                    ref={containerRef}
                    contentEditable={false}
                    style={{
                        padding: '2px 4px',
                        backgroundColor: 'var(--ks-color-scale-purple3)',
                        borderRadius: '3px',
                        color: 'var(--ks-color-scale-purple11)',
                        border: '1px solid var(--ks-color-scale-purple6)',
                        display: 'inline-block',
                        verticalAlign: 'middle'
                    }}
                >
                    {!isInline && <span style={{ opacity: 0.6, fontSize: '10px', marginRight: '4px' }}>[block]</span>}
                    <span ref={mathContainerRef}>{rawEquation ? `$${rawEquation}$` : '(no equation)'}</span>
                </span>
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
    FootnoteDefinition,
    Biography,
    Thanks,
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
    Timeline,
    TimelineEntry,
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
    EmbeddedYouTube,
    MainLogo,
    ThemedImage,
    ContentWarning,
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
    LightboxVideo: createLightboxVideoComponent(blogImagePath),
    ImageWithText: createImageWithTextComponent({ blogImagePath }),
};

// ============================================================================
// PLACEHOLDER COMPONENT FACTORY
// ============================================================================
// Creates a placeholder for undefined/missing components to prevent page errors
// Uses fields.ignored() to accept common prop names without validation errors

// Common prop names that components might use - all use ignored() to accept any value
const placeholderSchema = {
    // Common text/content props
    message: fields.ignored(),
    text: fields.ignored(),
    value: fields.ignored(),
    content: fields.ignored(),
    title: fields.ignored(),
    name: fields.ignored(),
    label: fields.ignored(),
    description: fields.ignored(),
    placeholder: fields.ignored(),
    caption: fields.ignored(),
    heading: fields.ignored(),
    subheading: fields.ignored(),
    body: fields.ignored(),
    summary: fields.ignored(),
    // Common HTML-like props
    id: fields.ignored(),
    class: fields.ignored(),
    className: fields.ignored(),
    style: fields.ignored(),
    slot: fields.ignored(),
    // Media props
    src: fields.ignored(),
    href: fields.ignored(),
    alt: fields.ignored(),
    url: fields.ignored(),
    image: fields.ignored(),
    icon: fields.ignored(),
    thumbnail: fields.ignored(),
    poster: fields.ignored(),
    // State/behavior props
    type: fields.ignored(),
    variant: fields.ignored(),
    size: fields.ignored(),
    color: fields.ignored(),
    theme: fields.ignored(),
    mode: fields.ignored(),
    disabled: fields.ignored(),
    hidden: fields.ignored(),
    loading: fields.ignored(),
    active: fields.ignored(),
    selected: fields.ignored(),
    checked: fields.ignored(),
    open: fields.ignored(),
    closed: fields.ignored(),
    expanded: fields.ignored(),
    collapsed: fields.ignored(),
    visible: fields.ignored(),
    enabled: fields.ignored(),
    required: fields.ignored(),
    optional: fields.ignored(),
    readonly: fields.ignored(),
    editable: fields.ignored(),
    // Layout props
    width: fields.ignored(),
    height: fields.ignored(),
    maxWidth: fields.ignored(),
    maxHeight: fields.ignored(),
    minWidth: fields.ignored(),
    minHeight: fields.ignored(),
    padding: fields.ignored(),
    margin: fields.ignored(),
    gap: fields.ignored(),
    align: fields.ignored(),
    justify: fields.ignored(),
    position: fields.ignored(),
    layout: fields.ignored(),
    direction: fields.ignored(),
    orientation: fields.ignored(),
    columns: fields.ignored(),
    rows: fields.ignored(),
    span: fields.ignored(),
    order: fields.ignored(),
    // Data props
    data: fields.ignored(),
    items: fields.ignored(),
    options: fields.ignored(),
    list: fields.ignored(),
    array: fields.ignored(),
    object: fields.ignored(),
    json: fields.ignored(),
    config: fields.ignored(),
    settings: fields.ignored(),
    props: fields.ignored(),
    params: fields.ignored(),
    args: fields.ignored(),
    // Numeric props
    count: fields.ignored(),
    index: fields.ignored(),
    number: fields.ignored(),
    amount: fields.ignored(),
    total: fields.ignored(),
    min: fields.ignored(),
    max: fields.ignored(),
    step: fields.ignored(),
    level: fields.ignored(),
    priority: fields.ignored(),
    // Date/time props
    date: fields.ignored(),
    time: fields.ignored(),
    datetime: fields.ignored(),
    timestamp: fields.ignored(),
    duration: fields.ignored(),
    delay: fields.ignored(),
    // Event-like props (stored as strings in MDX)
    onClick: fields.ignored(),
    onChange: fields.ignored(),
    onSubmit: fields.ignored(),
    onLoad: fields.ignored(),
    onError: fields.ignored(),
    onClose: fields.ignored(),
    onOpen: fields.ignored(),
    // Misc common props
    key: fields.ignored(),
    ref: fields.ignored(),
    target: fields.ignored(),
    rel: fields.ignored(),
    role: fields.ignored(),
    tabIndex: fields.ignored(),
    autoFocus: fields.ignored(),
    children: fields.ignored(),
};

const createPlaceholderComponent = (name: string) => wrapper({
    label: `${name} (Placeholder)`,
    schema: placeholderSchema,
    ContentView: (props) => (
        <div style={{
            padding: '12px 16px',
            border: '2px dashed #f59e0b',
            borderRadius: '6px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            color: '#92400e',
            fontFamily: 'monospace',
            fontSize: '13px',
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                Missing component: {name}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>
                This component is not defined. Add it to keystatic.config.tsx or remove from content.
            </div>
            {props.children && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    {props.children}
                </div>
            )}
        </div>
    ),
});

// ============================================================================
// SITE-SPECIFIC KEYSTATIC COMPONENTS
// ============================================================================
// Load site-specific keystatic editor components dynamically based on siteCode
// Only load in development mode - keystatic is excluded from production builds
const siteSpecificComponents: Record<string, any> = {};

if (process.env.NODE_ENV === 'development') {
    const siteKeystatiComponentsGlob = import.meta.glob<{ [key: string]: any }>(
        '/src/.sites/**/keystatic/*.tsx',
        { eager: true }
    );

    // Filter and collect components for the current site
    for (const [path, module] of Object.entries(siteKeystatiComponentsGlob)) {
        if (path.includes(`.sites/${siteCode}/keystatic/`)) {
            // Extract component name from filename (e.g., ExampleComponent.tsx -> ExampleComponent)
            const fileName = path.split('/').pop()?.replace('.tsx', '');
            if (fileName && module[fileName]) {
                siteSpecificComponents[fileName] = module[fileName];
            }
        }
    }
}

// ============================================================================
// PLACEHOLDER COMPONENTS
// ============================================================================
// Add any components referenced in MDX but not yet implemented
// Site-specific components override placeholders
const placeholderComponents = {
    // Placeholders are only used if no site-specific component exists
    ...(siteSpecificComponents.ExampleComponent ? {} : { ExampleComponent: createPlaceholderComponent('ExampleComponent') }),
    ...siteSpecificComponents, // Site-specific components take precedence
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
    ...placeholderComponents,
});

const pageComponents = wrapComponentsWithToolbar({
    ...minimalHtmlComponents,
    ...sharedCustomComponents,
    ...placeholderComponents,
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
            format: { contentField: 'content' },
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
            path: (() => {
                const p = `src/.sites/${siteCode}/state/system-menu-items`;
                console.log('[Keystatic Config] Singleton path:', p);
                return p;
            })(),
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
