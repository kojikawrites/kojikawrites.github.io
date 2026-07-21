/**
 * useTextSelection Hook - DEV ONLY
 * Detects and tracks text selection in the editor
 * Filters out component nodes to focus on text content only
 */
import { useState, useEffect, useCallback, RefObject } from 'react';

export interface TextSelection {
  text: string;
  range: Range | null;
  rect: DOMRect | null;
}

export interface UseTextSelectionOptions {
  /** Ref to the container element to monitor selections within */
  containerRef?: RefObject<HTMLElement>;
  /** Minimum text length to consider a valid selection */
  minLength?: number;
  /** Whether to ignore selections within certain elements (e.g., code blocks, components) */
  ignoreElements?: string[];
}

/**
 * Hook to detect and track text selection
 * Returns selected text, range, and position information
 */
export function useTextSelection(options: UseTextSelectionOptions = {}) {
  const {
    containerRef,
    minLength = 1,
    ignoreElements = ['code', 'pre', '[data-component]'],
  } = options;

  const [selection, setSelection] = useState<TextSelection>({
    text: '',
    range: null,
    rect: null,
  });

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0) {
      setSelection({ text: '', range: null, rect: null });
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();

    // Check minimum length
    if (text.length < minLength) {
      setSelection({ text: '', range: null, rect: null });
      return;
    }

    // Check if selection is within the container (if specified)
    if (containerRef?.current) {
      const container = containerRef.current;
      if (!container.contains(range.commonAncestorContainer)) {
        setSelection({ text: '', range: null, rect: null });
        return;
      }
    }

    // Check if selection is within ignored elements
    const ancestor = range.commonAncestorContainer;
    const ancestorElement =
      ancestor.nodeType === Node.ELEMENT_NODE
        ? (ancestor as Element)
        : ancestor.parentElement;

    if (ancestorElement) {
      for (const selector of ignoreElements) {
        if (ancestorElement.closest(selector)) {
          setSelection({ text: '', range: null, rect: null });
          return;
        }
      }
    }

    // Get selection rectangle for positioning context menu
    const rect = range.getBoundingClientRect();

    setSelection({
      text,
      range: range.cloneRange(),
      rect: DOMRect.fromRect(rect),
    });
  }, [containerRef, minLength, ignoreElements]);

  useEffect(() => {
    // Listen to selection changes
    document.addEventListener('selectionchange', handleSelectionChange);

    // Also listen to mouseup to catch selection changes
    document.addEventListener('mouseup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  /**
   * Programmatically clear the selection
   */
  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection({ text: '', range: null, rect: null });
  }, []);

  /**
   * Replace the selected text with new text
   */
  const replaceSelection = useCallback(
    (newText: string) => {
      if (!selection.range) return false;

      try {
        const range = selection.range;
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));

        // Move cursor to end of inserted text
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        setSelection({ text: '', range: null, rect: null });
        return true;
      } catch (error) {
        console.error('Failed to replace selection:', error);
        return false;
      }
    },
    [selection.range]
  );

  /**
   * Insert text after the selection
   */
  const insertAfterSelection = useCallback(
    (newText: string) => {
      if (!selection.range) return false;

      try {
        const range = selection.range;
        range.collapse(false); // Collapse to end
        range.insertNode(document.createTextNode(newText));

        // Move cursor to end of inserted text
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        setSelection({ text: '', range: null, rect: null });
        return true;
      } catch (error) {
        console.error('Failed to insert after selection:', error);
        return false;
      }
    },
    [selection.range]
  );

  return {
    selection,
    hasSelection: !!selection.text,
    clearSelection,
    replaceSelection,
    insertAfterSelection,
  };
}

export default useTextSelection;