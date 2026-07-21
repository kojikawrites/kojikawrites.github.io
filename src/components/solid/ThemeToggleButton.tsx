import { createSignal, createEffect, onMount, For } from 'solid-js';

const themes = ['light', 'dark', 'system'] as const;
type Theme = typeof themes[number];

// Get the system's preferred color scheme
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Icons: light (sun), system (monitor), dark (moon)
// Returns a function that takes theme name and returns SVG with proper alt text
const getIcon = (theme: Theme) => {
  const alt = `Use ${theme} theme`;

  switch (theme) {
    case 'light':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-label={alt}
          role="img"
        >
          <title>{alt}</title>
          <path
            fill-rule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clip-rule="evenodd"
          />
        </svg>
      );
    case 'system':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-label={alt}
          role="img"
        >
          <title>{alt}</title>
          <path
            fill-rule="evenodd"
            d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.321A.75.75 0 0113.415 17H6.585a.75.75 0 01-.287-1.44l.804-.32.122-.49H5a2 2 0 01-2-2V5zm2-.5a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V5a.5.5 0 00-.5-.5H5z"
            clip-rule="evenodd"
          />
        </svg>
      );
    case 'dark':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-label={alt}
          role="img"
        >
          <title>{alt}</title>
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      );
  }
};

export default function ThemeToggleButton() {
  const [theme, setTheme] = createSignal<Theme>('system');

  // Apply the actual theme class based on selection
  function applyTheme(selectedTheme: Theme) {
    const rootEl = document.documentElement;
    const effectiveTheme = selectedTheme === 'system' ? getSystemTheme() : selectedTheme;
    if (effectiveTheme === 'dark') {
      rootEl.classList.add('theme-dark');
    } else {
      rootEl.classList.remove('theme-dark');
    }
  }

  onMount(() => {
    // Initialize theme from localStorage or default to system
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && themes.includes(stored)) {
      setTheme(stored);
    }

    // Listen for system theme changes when in 'system' mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme() === 'system') {
        applyTheme('system');
      }
    });
  });

  // React to theme changes
  createEffect(() => {
    applyTheme(theme());
  });

  function handleChange(t: Theme) {
    setTheme(t);
    localStorage.setItem('theme', t);
    localStorage.setItem('themeSet', 'true');
    window.dispatchEvent(new Event('storage'));

    // iOS has a WebGL compositor caching bug where canvas content doesn't
    // update properly on theme change. Trigger a View Transition to the
    // same page to force a full repaint without a hard reload.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    if (isIOS) {
      // Use View Transitions API if available, otherwise navigate normally
      if ('startViewTransition' in document) {
        (document as any).startViewTransition(() => {
          // Navigate to current URL to trigger transition
          window.location.href = window.location.href;
        });
      } else {
        // Fallback: navigate to self (triggers Astro page transition)
        setTimeout(() => {
          window.location.href = window.location.href;
        }, 50);
      }
    }
  }

  return (
    <div class="theme-toggle">
      <For each={[...themes]}>
        {(t) => (
          <label class={theme() === t ? 'checked' : ''}>
            {getIcon(t)}
            <input
              type="radio"
              name="theme-toggle"
              checked={theme() === t}
              value={t}
              title={`Use ${t} theme`}
              aria-label={`Use ${t} theme`}
              onChange={() => handleChange(t)}
            />
          </label>
        )}
      </For>
    </div>
  );
}
