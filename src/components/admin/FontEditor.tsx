import { createSignal, createEffect, For, Show, onMount, type Component } from 'solid-js';

interface FontValue {
    name: string;
    value: string;
    displayName: string;
    description: string;
}

interface AvailableFont {
    name: string;
    type: 'serif' | 'sans-serif' | 'monospace';
    builtin?: boolean;
}

// Font variable metadata for determining appropriate fallbacks
const FONT_FALLBACKS: Record<string, string> = {
    'font-family-serif': 'serif',
    'font-family-sans': 'sans-serif',
    'font-family-sans-alt': 'sans-serif',
    'font-family-monospace': 'monospace'
};

/**
 * Extract the primary font name from a CSS font-family value
 * e.g., "'Fira Sans', sans-serif" -> "Fira Sans"
 */
const extractPrimaryFont = (value: string): string => {
    // Handle system default monospace stack
    if (value.includes('SFMono-Regular') || value.includes('Menlo')) {
        return 'System Default';
    }
    // Remove quotes and get the first font in the stack
    const fonts = value.split(',').map(f => f.trim().replace(/^['"]|['"]$/g, ''));
    return fonts[0] || value;
};

/**
 * Build a font-family CSS value with proper fallback
 */
const buildFontValue = (fontName: string, fallback: string): string => {
    // Handle special case for system monospace stack
    if (fontName === 'System Default' && fallback === 'monospace') {
        return 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    }

    // Quote font names with spaces
    const quotedName = fontName.includes(' ') ? `'${fontName}'` : fontName;
    return `${quotedName}, ${fallback}`;
};

/**
 * Get fonts appropriate for a variable type, grouped by source
 */
const getAppropriateFonts = (varName: string, availableFonts: AvailableFont[]): { bundled: AvailableFont[], system: AvailableFont[] } => {
    const fallback = FONT_FALLBACKS[varName];

    let filtered: AvailableFont[];

    if (fallback === 'monospace') {
        // For monospace, show only monospace fonts plus system default
        filtered = availableFonts.filter(f => f.type === 'monospace' || f.name === 'System Default');
    } else if (fallback === 'serif') {
        // For serif, show serif fonts first, then sans-serif (but NOT monospace)
        const serifFonts = availableFonts.filter(f => f.type === 'serif');
        const sansFonts = availableFonts.filter(f => f.type === 'sans-serif');
        filtered = [...serifFonts, ...sansFonts];
    } else {
        // For sans-serif, show sans fonts first, then serif (but NOT monospace)
        const sansFonts = availableFonts.filter(f => f.type === 'sans-serif');
        const serifFonts = availableFonts.filter(f => f.type === 'serif');
        filtered = [...sansFonts, ...serifFonts];
    }

    // Separate bundled from system fonts
    const bundled = filtered.filter(f => !f.builtin);
    const system = filtered.filter(f => f.builtin);

    return { bundled, system };
};

// Individual preview components for each font type
const SerifPreview: Component = () => (
    <div class="font-preview-sample">
        <p class="serif-sample">
            This paragraph uses the serif font for body text. The serif font is designed
            for readability in longer passages of text, making it ideal for articles and blog posts.
        </p>
        <div class="quote-block">
            <p>Typography is the craft of endowing human language with a durable visual form.</p>
        </div>
    </div>
);

const SansPreview: Component = () => (
    <div class="font-preview-sample">
        <div class="navbar w-full px-2 py-3 flex flex-row rounded-md">
            <nav class="flex flex-row items-start">
                <a href="#" class="max-w-fit text-nowrap px-2 py-1">Home</a>
                <a href="#" class="selected max-w-fit text-nowrap px-2 py-1">Blog</a>
                <a href="#" class="max-w-fit text-nowrap px-2 py-1">About</a>
            </nav>
        </div>
        <div class="headings-sample">
            <h1>Page Title (H1)</h1>
            <h2>Section Heading (H2)</h2>
            <h3>Subsection (H3)</h3>
        </div>
    </div>
);

const SansAltPreview: Component = () => (
    <div class="font-preview-sample">
        <nav class="c-breadcrumbs text-xs mb-3">
            <span class="c-breadcrumbs__link color-primary-color">Home</span>
            <span class="color-text-secondary mx-1">/</span>
            <span class="c-breadcrumbs__link color-primary-color">Blog</span>
            <span class="color-text-secondary mx-1">/</span>
            <span class="color-secondary-color">Current Page</span>
        </nav>
        <div class="tags-sample">
            <span class="sample-label">Category:</span>
            <a href="#" class="category text-nowrap">Tutorial</a>
            <span class="sample-label ml-3">Tags:</span>
            <a href="#" class="tag text-nowrap">fonts</a>
            <a href="#" class="tag text-nowrap">typography</a>
            <a href="#" class="tag text-nowrap">design</a>
        </div>
    </div>
);

const MonospacePreview: Component = () => (
    <div class="font-preview-sample">
        <p class="inline-code-sample">
            Inline code example: <code>const font = 'monospace';</code>
        </p>
        <pre><code>{`function setFont(family) {
  document.documentElement.style
    .setProperty('--font-family', family);
}`}</code></pre>
    </div>
);

// Map font variable names to their preview components
const FONT_PREVIEWS: Record<string, Component> = {
    'font-family-serif': SerifPreview,
    'font-family-sans': SansPreview,
    'font-family-sans-alt': SansAltPreview,
    'font-family-monospace': MonospacePreview
};

// Font section component - combines preview and controls for each font
const FontSection: Component<{
    font: FontValue;
    originalFont: FontValue | undefined;
    availableFonts: AvailableFont[];
    onFontChange: (name: string, newFont: string) => void;
    onReset: (name: string) => void;
}> = (props) => {
    const selectedFont = () => extractPrimaryFont(props.font.value);
    const appropriateFonts = () => getAppropriateFonts(props.font.name, props.availableFonts);
    const isMonospace = () => FONT_FALLBACKS[props.font.name] === 'monospace';
    const hasChanged = () => props.originalFont && props.font.value !== props.originalFont.value;

    const handleChange = (e: Event) => {
        const select = e.target as HTMLSelectElement;
        const newFontName = select.value;
        const fallback = FONT_FALLBACKS[props.font.name];
        const newValue = buildFontValue(newFontName, fallback);
        props.onFontChange(props.font.name, newValue);
    };

    // Get the preview component for this font type
    const PreviewComponent = FONT_PREVIEWS[props.font.name];

    return (
        <div class="font-section">
            <div class="font-section-header">
                <label class="font-label">{props.font.displayName}</label>
                <span class="font-description">{props.font.description}</span>
            </div>

            {/* Preview sample for this font */}
            <Show when={PreviewComponent}>
                <div class="font-preview-inline">
                    {PreviewComponent && <PreviewComponent />}
                </div>
            </Show>

            {/* Font controls */}
            <div class="font-controls">
                <select
                    value={selectedFont()}
                    onChange={handleChange}
                    class="font-select"
                >
                    <Show when={appropriateFonts().bundled.length > 0}>
                        <optgroup label="Bundled Fonts">
                            <For each={appropriateFonts().bundled}>
                                {(availableFont) => (
                                    <option value={availableFont.name}>
                                        {availableFont.name}
                                        {availableFont.type !== FONT_FALLBACKS[props.font.name]?.replace('-', '') &&
                                            ` (${availableFont.type})`}
                                    </option>
                                )}
                            </For>
                        </optgroup>
                    </Show>
                    <Show when={appropriateFonts().system.length > 0}>
                        <optgroup label="System Fonts">
                            <For each={appropriateFonts().system}>
                                {(availableFont) => (
                                    <option value={availableFont.name}>
                                        {availableFont.name}
                                        {availableFont.type !== FONT_FALLBACKS[props.font.name]?.replace('-', '') &&
                                            availableFont.name !== 'System Default' &&
                                            ` (${availableFont.type})`}
                                    </option>
                                )}
                            </For>
                        </optgroup>
                    </Show>
                </select>
                <button
                    class="btn-reset"
                    onClick={() => props.onReset(props.font.name)}
                    disabled={!hasChanged()}
                    title="Reset to original"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                </button>
            </div>
        </div>
    );
};

// Main FontEditor component
export const FontEditor: Component = () => {
    const [fonts, setFonts] = createSignal<FontValue[]>([]);
    const [originalFonts, setOriginalFonts] = createSignal<FontValue[]>([]);
    const [availableFonts, setAvailableFonts] = createSignal<AvailableFont[]>([]);
    const [loading, setLoading] = createSignal(true);
    const [saving, setSaving] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [success, setSuccess] = createSignal<string | null>(null);

    // Load fonts on mount
    onMount(async () => {
        try {
            const response = await fetch('/api/fonts');
            const data = await response.json();
            if (data.success) {
                setFonts(data.fonts);
                setOriginalFonts(JSON.parse(JSON.stringify(data.fonts)));
                setAvailableFonts(data.availableFonts || []);
            } else {
                setError(data.error || 'Failed to load fonts');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load fonts');
        } finally {
            setLoading(false);
        }
    });

    // Apply font changes to CSS variables in real-time
    const applyFontToDocument = (name: string, value: string) => {
        document.documentElement.style.setProperty(`--${name}`, value);
    };

    // Handle font change
    const handleFontChange = (name: string, newValue: string) => {
        setFonts(prev => prev.map(f =>
            f.name === name ? { ...f, value: newValue } : f
        ));
        applyFontToDocument(name, newValue);
    };

    // Check if there are unsaved changes
    const hasChanges = () => {
        return JSON.stringify(fonts()) !== JSON.stringify(originalFonts());
    };

    // Save fonts
    const saveFonts = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/fonts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fonts: fonts() })
            });

            const data = await response.json();

            if (data.success) {
                setOriginalFonts(JSON.parse(JSON.stringify(fonts())));
                setSuccess('Fonts saved successfully! The page will refresh to apply changes.');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setError(data.error || 'Failed to save fonts');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to save fonts');
        } finally {
            setSaving(false);
        }
    };

    // Reset fonts to original values
    const resetFonts = () => {
        const original = JSON.parse(JSON.stringify(originalFonts()));
        setFonts(original);
        // Reapply original values to document
        for (const font of original) {
            applyFontToDocument(font.name, font.value);
        }
        setError(null);
        setSuccess(null);
    };

    // Reset a single font to its original value
    const resetSingleFont = (name: string) => {
        const original = originalFonts().find(f => f.name === name);
        if (original) {
            handleFontChange(name, original.value);
        }
    };

    // Get original font by name
    const getOriginalFont = (name: string) => originalFonts().find(f => f.name === name);

    return (
        <div class="font-editor">
            <Show when={loading()}>
                <div class="loading">Loading fonts...</div>
            </Show>

            <Show when={error()}>
                <div class="message error">{error()}</div>
            </Show>

            <Show when={success()}>
                <div class="message success">{success()}</div>
            </Show>

            <Show when={!loading() && fonts().length > 0}>
                <div class="font-list">
                    <For each={fonts()}>
                        {(font) => (
                            <FontSection
                                font={font}
                                originalFont={getOriginalFont(font.name)}
                                availableFonts={availableFonts()}
                                onFontChange={handleFontChange}
                                onReset={resetSingleFont}
                            />
                        )}
                    </For>
                </div>

                <div class="button-group">
                    <button
                        class="btn-primary"
                        onClick={saveFonts}
                        disabled={saving() || !hasChanges()}
                    >
                        {saving() ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        class="btn-secondary"
                        onClick={resetFonts}
                        disabled={saving() || !hasChanges()}
                    >
                        Reset
                    </button>
                </div>
            </Show>
        </div>
    );
};

export default FontEditor;