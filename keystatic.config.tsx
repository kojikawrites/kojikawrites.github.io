/** @jsxImportSource react */
// @ts-ignore
import { config, fields, collection } from '@keystatic/core';
// @ts-ignore
import { wrapper, block, inline } from '@keystatic/core/content-components';
import { categoryOptions } from './src/scripts/onbuild/categories';
import { tags } from './src/scripts/onbuild/tags';
import React from 'react';
import { getSiteCode } from "./src/scripts/getSiteConfig.ts";



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

const commonCategoriesText = `Common categories: ${categoryOptions.map(c => c.value).join(', ')}. You can also enter a custom category.`;
const commonTagsText = `Common tags: ${tags.join(', ')}. You can also enter a custom tag.`;

let currentSlug = ''; // Global slug tracker for ContentView components

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

/** Hook to track current slug from DOM */
const useSlugTracking = (enabled: boolean) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    if (!enabled) return;

    const findSlug = () => {
      const labels = document.querySelectorAll('label');
      for (const label of labels) {
        if (label.textContent?.includes('Slug')) {
          const inputId = label.getAttribute('for');
          if (inputId) {
            const input = document.getElementById(inputId) as HTMLInputElement;
            if (input?.value && currentSlug !== input.value) {
              currentSlug = input.value;
              forceUpdate();
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
  }, [enabled]);
};

// ============================================================================
// IMAGE CONTENT VIEW FACTORY
// ============================================================================
const createImageContentView = (options: {
  imageDirectory: string;
  includeCaption?: boolean;
  includeSlugTracking?: boolean;
  defaultAlt?: string;
}) => (props: any) => {
  const { image, src, alt, caption } = props.value;
  useSlugTracking(options.includeSlugTracking ?? false);

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

const createImageComponent = (type: 'Lightbox' | 'Gallery', imagePath: string) => {
  const isGallery = type === 'Gallery';

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
      includeSlugTracking: isGallery,
      defaultAlt: `${type} image`,
    }),
  });
};

const createLightboxImageComponent = (imagePath: string) => createImageComponent('Lightbox', imagePath);
const createGalleryImageComponent = (imagePath: string) => createImageComponent('Gallery', imagePath);

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
  // Inline elements for text styling (can't have children, use text field instead)
  InlineSpan: inline({
    label: 'Inline Span',
    schema: {
      text: fields.text({ label: 'Text' }),
      id: fields.text({ label: 'Id' }),
      class: classField(),
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

      React.useEffect(() => {
        // Ensure MathJax is loaded
        if (!(window as any).MathJax) {
          // Configure MathJax before loading
          (window as any).MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\(', '\\)']],
              displayMath: [['$$', '$$'], ['\\[', '\\]']]
            },
            svg: {
              fontCache: 'global'
            }
          };

          // Load MathJax script
          const script = document.createElement('script');
          script.src = '/scripts/prebuilt/mathjax-tex-svg-full.js';
          script.async = true;
          script.id = 'MathJax-script';
          document.head.appendChild(script);
        }
      }, []);

      React.useEffect(() => {
        const typeset = () => {
          if (containerRef.current && (window as any).MathJax?.typesetPromise) {
            (window as any).MathJax.typesetPromise([containerRef.current])
              .catch((err: any) => console.error('MathJax typeset failed:', err));
          }
        };

        // Wait for MathJax to be ready
        if ((window as any).MathJax?.typesetPromise) {
          typeset();
        } else {
          // Poll for MathJax to be ready
          const interval = setInterval(() => {
            if ((window as any).MathJax?.typesetPromise) {
              clearInterval(interval);
              typeset();
            }
          }, 100);

          return () => clearInterval(interval);
        }
      }, [equation, isInline]);

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
  MainLogo: simpleBlock('Main Logo'),
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
  ContentWarning: simpleWrapper('Content Warning', {
    warning: fields.text({ label: 'Warning' }),
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
  LightboxVideo: simpleBlock('Lightbox Video', {
    src: fields.text({ label: 'Source' }),
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
    LightboxImage: createLightboxImageComponent(baseImagePath),
  // LightboxImage: block({
  //   label: 'Lightbox Image',
  //   schema: {
  //     image: fields.image({
  //       label: 'Image (Picker)',
  //       directory: `${baseImagePath}`,
  //       publicPath: `/${baseImagePath}/`,
  //     }),
  //     src: fields.text({
  //       label: 'Or enter path manually',
  //       description: 'Legacy support - leave empty if using image picker above',
  //     }),
  //     alt: fields.text({ label: 'Alt Text' }),
  //     description: fields.text({ label: 'Detailed Description' }),
  //   },
  //   ContentView: createImageContentView({
  //     imageDirectory: `/${baseImagePath}`,
  //     includeCaption: false,
  //     includeSlugTracking: false,
  //     defaultAlt: 'Lightbox image',
  //   }),
  // }),
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
    defaultValue: 'hiive',
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
});
