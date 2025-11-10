/** @jsxImportSource react */
// @ts-ignore
import { config, fields, collection, singleton } from '@keystatic/core';
// @ts-ignore
import { wrapper, block, inline } from '@keystatic/core/content-components';
import { categories } from './src/scripts/onbuild/categories';
import { tags } from './src/scripts/onbuild/tags';
import React from 'react';
import { getSiteCode } from "./src/scripts/getSiteConfig.ts";
import pre = $effect.pre;



// ============================================================================
// CONFIGURATION DIRECTORIES
// ============================================================================
const siteCode = getSiteCode();
const baseDir = 'src';

const basePostPath = `${baseDir}/assets/posts/${siteCode}`;
const basePagePath = `${baseDir}/assets/pagecontent/${siteCode}`;

const baseImagePath = `${baseDir}/assets/images/${siteCode}`;
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
    const { image, src, alt, caption } = value;
    const currentSlug = React.useContext(SlugContext); // Get slug from context instead of global

    // Determine image source
    let imageSrc: string | null = null;
    let previewSrc: string | null = null;
    let sourceInfo = '';
    let isNewlySelected = false;

    if (image) {
      const extracted = extractImageData(image);
      isNewlySelected = extracted.isNewlySelected;
      previewSrc = extracted.previewSrc;

      if (extracted.filename) {
        sourceInfo = `Picker: ${extracted.filename}${currentSlug && options.includeSlugTracking ? ` (slug: ${currentSlug})` : ''}`;
        imageSrc = buildImagePath(
          extracted.filename,
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

    // Clean up blob URLs when component unmounts or previewSrc changes
    // Must be called unconditionally (Rules of Hooks)
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

    const displaySrc = isNewlySelected && previewSrc ? previewSrc : imageSrc;

    return (
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
    );
  };

  // Return the component wrapped in SlugProvider
  return (props: any) => (
    <SlugProvider enabled={options.includeSlugTracking ?? false}>
      <ImageContentViewInner value={props.value} />
    </SlugProvider>
  );
};

const createImageComponent = (type: 'Lightbox' | 'Gallery', imagePath: string, includeSlugTracking?: boolean) => {
  const isGallery = type === 'Gallery';
  const slugTracking = includeSlugTracking !== undefined ? includeSlugTracking : isGallery;

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
      alt: fields.text({ label: 'Alt Text' }),
      description: fields.text({ label: 'Detailed Description' }),
      caption: fields.text({ label: 'Caption' })
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
  Biography: simpleWrapper('Biography', {
    id: fields.text({ label: 'ID' }),
    alt: fields.text({ label: 'Alt Text' }),
    class: classField(),
    src: fields.text({ label: 'Source' }),
  }),
  Thanks: simpleWrapper('Thanks', {
    name: fields.text({ label: 'Name' }),
    url: fields.text({ label: 'URL' }),
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
      return (
        <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
          <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
            🏢 Main Logo (Dated)
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', color: 'var(--ks-color-scale-slate11)', marginBottom: '4px' }}>Light Theme:</div>
              <img
                src="/src/assets/images/hiivelabs.com/logos/dynamic/hiive-logo-light.svg"
                alt="Main logo (light)"
                style={{ maxWidth: '100%', maxHeight: '150px', height: 'auto', display: 'block', backgroundColor: '#fff', padding: '8px', border: '1px solid var(--ks-color-scale-slate6)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', color: 'var(--ks-color-scale-slate11)', marginBottom: '4px' }}>Dark Theme:</div>
              <img
                src="/src/assets/images/hiivelabs.com/logos/dynamic/hiive-logo-dark.svg"
                alt="Main logo (dark)"
                style={{ maxWidth: '100%', maxHeight: '150px', height: 'auto', display: 'block', backgroundColor: '#222', padding: '8px', border: '1px solid var(--ks-color-scale-slate6)' }}
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
      alt: fields.text({ label: 'Alt Text' }),
    },
    ContentView: (props) => {
      const { src, alt } = props.value;

      if (!src) {
        return <div style={{ padding: '12px', border: '1px dashed #ccc', borderRadius: '4px' }}>
          <p>No themed image source specified</p>
        </div>;
      }

      // Replace [THEME] with 'light' for preview (default editor theme)
      const lightSrc = src.includes('[THEME]') ? src.replace('[THEME]', 'light') : src;
      const darkSrc = src.includes('[THEME]') ? src.replace('[THEME]', 'dark') : src;

      return (
        <div style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px', fontFamily: 'monospace' }}>
            Themed Image: {src}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                Light theme
              </div>
              <img
                src={lightSrc}
                alt={alt || 'Themed image (light)'}
                style={{ maxWidth: '100%', height: 'auto', display: 'block', border: '1px solid #ddd', backgroundColor: '#ddd', padding: '8px' }}
                onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: '#666' }}>
                Dark theme
              </div>
              <img
                src={darkSrc}
                alt={alt || 'Themed image (dark)'}
                style={{ maxWidth: '100%', height: 'auto', display: 'block', border: '1px solid #ddd', backgroundColor: '#2220', padding: '8px' }}
                onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
              />
            </div>
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
  // LightboxImage: block({
  //   label: 'Lightbox Image',
  //   schema: {
  //     image: fields.image({
  //       label: 'Image (Picker)',
  //       directory: blogImagePath,
  //       publicPath: `/${blogImagePath}/`,
  //     }),
  //     src: fields.text({
  //       label: 'Or enter path manually',
  //       description: 'Legacy support - leave empty if using image picker above',
  //     }),
  //     id: fields.text({ label: 'Optional ID' }),
  //     alt: fields.text({ label: 'Alt Text' }),
  //     caption: fields.text({ label: 'Caption' }),
  //     description: fields.text({ label: 'Detailed Description' }),
  //   },
  //   ContentView: createImageContentView({
  //     imageDirectory: `/${blogImagePath}`,
  //     includeCaption: true,
  //     includeSlugTracking: true,
  //     defaultAlt: 'Lightbox image',
  //   }),
  // }),
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

      // Extract inline image source
      let inlineImageSrc: string | null = null;
      let inlinePreviewSrc: string | null = null;
      let inlineIsNew = false;

      if (inlineImg) {
        const extracted = extractImageData(inlineImg);
        inlineIsNew = extracted.isNewlySelected;
        inlinePreviewSrc = extracted.previewSrc;
        if (extracted.filename) {
          inlineImageSrc = buildImagePath(extracted.filename, `/${blogImagePath}`, currentSlug);
        }
      }

      // Extract preview image source
      let previewImageSrc: string | null = null;
      let previewPreviewSrc: string | null = null;

      if (previewImg) {
        const extracted = extractImageData(previewImg);
        previewPreviewSrc = extracted.previewSrc;
        if (extracted.filename) {
          previewImageSrc = buildImagePath(extracted.filename, `/${blogImagePath}`, currentSlug);
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

      const displayInlineSrc = inlineIsNew && inlinePreviewSrc ? inlinePreviewSrc : inlineImageSrc;

      return (
        <div style={{ padding: '12px', border: '1px solid var(--ks-color-scale-slate6)', borderRadius: '4px', backgroundColor: 'var(--ks-color-scale-slate2)' }}>
          <div style={{ fontSize: '10px', color: 'var(--ks-color-scale-slate11)', marginBottom: '8px', fontFamily: 'monospace' }}>
            🎥 Lightbox Video: {videoSrc.split('/').pop()}
          </div>

          {/* Show inline image preview */}
          <img
            src={displayInlineSrc}
            alt={alt}
            style={{ maxWidth: '100%', maxHeight: '200px', height: 'auto', display: 'block', border: '2px solid currentColor' }}
            onError={(e) => { (e.target as HTMLImageElement).style.border = '2px solid red'; }}
          />


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
// COMPONENT COLLECTIONS
// ============================================================================
const blogComponents = {
  ...minimalHtmlComponents,
  ...sharedCustomComponents,
  ...blogSpecificComponents,
};

const pageComponents = {
  ...minimalHtmlComponents,
  ...sharedCustomComponents,
  LightboxImage: createLightboxImageComponent(baseImagePath, true),
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

        // Determine image source
        let imageSrc: string | null = null;
        let previewSrc: string | null = null;
        let sourceInfo = '';
        let isNewlySelected = false;

        if (image) {
          const extracted = extractImageData(image);
          isNewlySelected = extracted.isNewlySelected;
          previewSrc = extracted.previewSrc;

          if (extracted.filename) {
            sourceInfo = `Picker: ${extracted.filename}${currentSlug ? ` (slug: ${currentSlug})` : ''}`;
            imageSrc = buildImagePath(extracted.filename, `/${baseImagePath}`, currentSlug);
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
};

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
      validation: {
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
      owner: 'hiive',
      name: 'hiive.github.io',
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
      description: 'Posts dated today or earlier will be published within 24 hours. Posts with future dates will be published on the specified date.',
      slugField: 'title',
      path: `${basePostPath}/_drafts/*`,
      format: { contentField: 'content', data: 'json' },
      entryLayout: 'content',
      schema: createPostSchema(blogImagePath),
    }),

    pages: collection({
      label: 'Pages',
      slugField: 'title',
      path: `${basePagePath}/*`,
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
      path: 'src/assets/config/system-menu-items',
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
