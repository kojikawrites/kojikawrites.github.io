/** @jsxImportSource react */
/**
 * EditorToolbar Component - DEV ONLY
 * Provides quick access to LLM text operations
 * Standalone component that works without Keystatic React context
 * Automatically excluded from production builds via tree-shaking
 */
import React, { useState } from 'react';
import { LLMOperationModal, type LLMOperationStatus } from './LLMOperationModal';
import { categories } from '../../build/generators/categories';
import { tags } from '../../build/generators/tags';

export interface EditorToolbarProps {
  visible?: boolean;
}

interface LLMOperation {
  id: string;
  label: string;
  icon: string;
  description: string;
  requiresSelection: boolean;
}

const LLM_OPERATIONS: LLMOperation[] = [
  {
    id: 'continue',
    label: 'Continue',
    icon: '✍️',
    description: 'Continue writing from selected text',
    requiresSelection: true,
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: '✨',
    description: 'Improve grammar and clarity',
    requiresSelection: true,
  },
  {
    id: 'expand',
    label: 'Expand',
    icon: '📝',
    description: 'Add more detail and explanation',
    requiresSelection: true,
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: '📋',
    description: 'Create concise summary',
    requiresSelection: true,
  },
  {
    id: 'fix-grammar',
    label: 'Fix Grammar',
    icon: '🔧',
    description: 'Fix grammar and spelling',
    requiresSelection: true,
  },
  {
    id: 'make-shorter',
    label: 'Shorten',
    icon: '✂️',
    description: 'Make more concise',
    requiresSelection: true,
  },
];

const DESCRIPTION_OPERATION: LLMOperation = {
  id: 'generate-description',
  label: 'Generate Post Description',
  icon: '📄',
  description: 'Generate blog post description from content',
  requiresSelection: false,
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ visible = true }) => {
  const [selectedText, setSelectedText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<LLMOperationStatus>('idle');
  const [currentOperation, setCurrentOperation] = useState('');
  const [llmResult, setLlmResult] = useState('');
  const [llmError, setLlmError] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [llmContext, setLlmContext] = useState('');
  const [allowNewSuggestions, setAllowNewSuggestions] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  // Load editor styles and read max attempts from env
  React.useEffect(() => {
    if (!document.querySelector('link[href="/css/editor-styles.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/editor-styles.css';
      document.head.appendChild(link);
      console.log('[EditorToolbar] Editor styles CSS loaded');
    }

    // Read PUBLIC_LLM_MAX_ATTEMPTS from environment
    const envMaxAttempts = import.meta.env.PUBLIC_LLM_MAX_ATTEMPTS || '5';
    const attempts = parseInt(String(envMaxAttempts), 10) || 5;
    setMaxAttempts(attempts);
    console.log('[EditorToolbar] Max LLM attempts:', attempts);
  }, []);

  // Track text selection
  React.useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      setSelectedText(text.trim());
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Inject Generate button next to Description label
  React.useEffect(() => {
    const injectButton = () => {
      const labels = Array.from(document.querySelectorAll('label'));
      const descLabel = labels.find(l => {
        const text = l.textContent || '';
        return text.trim() === 'Description' || text.trim() === 'Description*';
      });

      if (descLabel) {
        // Check if button already exists
        if (document.querySelector('.gen-desc-btn')) return;

        // Create a wrapper div for the label row
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 4px;
        `;

        // Create button
        const button = document.createElement('button');
        button.className = 'gen-desc-btn ai-generate-btn';
        button.type = 'button';

        // Create robot icon
        const icon = document.createElement('img');
        icon.src = '/src/assets/images/admin/robot.svg';
        icon.alt = 'AI';
        icon.className = 'robot-icon';
        button.appendChild(icon);
        button.onclick = (e) => {
          e.preventDefault();
          handleDescriptionGeneration();
        };

        // Wrap label and button together
        const parent = descLabel.parentElement;
        if (parent) {
          parent.insertBefore(wrapper, descLabel);
          wrapper.appendChild(descLabel);
          wrapper.appendChild(button);
        }
      }
    };

    // Try to inject immediately
    injectButton();

    // Also retry periodically in case the label isn't rendered yet
    const interval = setInterval(injectButton, 500);

    return () => clearInterval(interval);
  }, []);

  // Handle category suggestion
  const handleCategorySuggestion = React.useCallback(() => {
    setLlmContext('');
    setCurrentOperation('Suggest Categories');
    setOriginalText('');
    setAllowNewSuggestions(false); // Reset checkbox
    setModalVisible(true);
    setModalStatus('idle');
  }, []);

  // Handle tag suggestion
  const handleTagSuggestion = React.useCallback(() => {
    setLlmContext('');
    setCurrentOperation('Suggest Tags');
    setOriginalText('');
    setAllowNewSuggestions(false); // Reset checkbox
    setModalVisible(true);
    setModalStatus('idle');
  }, []);

  // Inject Suggest buttons next to Categories and Tags labels
  React.useEffect(() => {
    const injectSuggestButtons = () => {
      // Look for span.kui:Text elements that contain "Categories" or "Tags"
      const textSpans = Array.from(document.querySelectorAll('span.kui\\:Text'));

      // Find Categories span
      const categoriesSpan = textSpans.find(span => {
        const text = span.textContent || '';
        return text.trim().startsWith('Categories');
      });

      if (categoriesSpan && !document.querySelector('.suggest-categories-btn')) {
        // Create a wrapper div for the label row
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 4px;
        `;

        // Create button
        const button = document.createElement('button');
        button.className = 'suggest-categories-btn ai-generate-btn';
        button.type = 'button';

        // Create robot icon
        const icon = document.createElement('img');
        icon.src = '/src/assets/images/admin/robot.svg';
        icon.alt = 'AI';
        icon.className = 'robot-icon';
        button.appendChild(icon);
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCategorySuggestion();
        };

        // Wrap label and button together
        const parent = categoriesSpan.parentElement;
        if (parent) {
          parent.insertBefore(wrapper, categoriesSpan);
          wrapper.appendChild(categoriesSpan);
          wrapper.appendChild(button);
        }
      }

      // Find Tags span
      const tagsSpan = textSpans.find(span => {
        const text = span.textContent || '';
        return text.trim().startsWith('Tags') && !text.includes('Categories');
      });

      if (tagsSpan && !document.querySelector('.suggest-tags-btn')) {
        // Create a wrapper div for the label row
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 4px;
        `;

        // Create button
        const button = document.createElement('button');
        button.className = 'suggest-tags-btn ai-generate-btn';
        button.type = 'button';

        // Create robot icon
        const icon = document.createElement('img');
        icon.src = '/src/assets/images/admin/robot.svg';
        icon.alt = 'AI';
        icon.className = 'robot-icon';
        button.appendChild(icon);
        button.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleTagSuggestion();
        };

        // Wrap label and button together
        const parent = tagsSpan.parentElement;
        if (parent) {
          parent.insertBefore(wrapper, tagsSpan);
          wrapper.appendChild(tagsSpan);
          wrapper.appendChild(button);
        }
      }
    };

    const interval = setInterval(injectSuggestButtons, 500);
    injectSuggestButtons();

    return () => clearInterval(interval);
  }, [handleCategorySuggestion, handleTagSuggestion]);

  // Helper to get content from editor
  const getEditorContent = (): string => {
    const editorElement = document.querySelector('[data-keystatic-editor="content"]');
    console.log('[getEditorContent] Editor element found:', !!editorElement);
    if (editorElement) {
      const content = editorElement.textContent || '';
      console.log('[getEditorContent] Content length:', content.length);
      return content;
    }
    return '';
  };

  // Helper to get title from title field
  const getTitle = (): string => {
    // Find the Title label and get its associated input
    const labels = Array.from(document.querySelectorAll('label'));
    const titleLabel = labels.find(l => {
      const text = l.textContent || '';
      return text.trim() === 'Title' || text.trim() === 'Title*';
    });

    console.log('[getTitle] Title label found:', !!titleLabel);

    if (titleLabel) {
      const inputId = titleLabel.getAttribute('for');
      if (inputId) {
        const titleInput = document.getElementById(inputId) as HTMLInputElement;
        console.log('[getTitle] Title input found:', !!titleInput);
        console.log('[getTitle] Title value:', titleInput?.value);
        return titleInput?.value || '';
      }
    }

    console.log('[getTitle] Title not found');
    return '';
  };

  // Helper to get current description value
  const getCurrentDescription = (): string => {
    // Try multiple approaches to find the Description field

    // Approach 1: Find label with "Description" text (with or without asterisk) and get associated input
    const labels = Array.from(document.querySelectorAll('label'));
    const descLabel = labels.find(l => {
      const text = l.textContent || '';
      // Match "Description" or "Description*"
      return text.trim() === 'Description' || text.trim() === 'Description*';
    });

    if (descLabel) {
      const inputId = descLabel.getAttribute('for');
      if (inputId) {
        const textarea = document.getElementById(inputId) as HTMLTextAreaElement;
        if (textarea) {
          return textarea.value || '';
        }
      }
    }

    // Approach 2: Find textarea by name attribute containing 'description'
    const textareas = Array.from(document.querySelectorAll('textarea'));
    const descTextarea = textareas.find(ta => {
      const name = ta.getAttribute('name') || '';
      return name.toLowerCase().includes('description');
    });

    if (descTextarea) {
      return descTextarea.value || '';
    }

    // Approach 3: Find any textarea in the sidebar that might be the description
    const sidebar = document.querySelector('[role="complementary"]') ||
                    document.querySelector('aside') ||
                    document.querySelector('[data-keystatic-sidebar]');

    if (sidebar) {
      const sidebarTextareas = sidebar.querySelectorAll('textarea');
      for (const ta of sidebarTextareas) {
        const label = ta.closest('div')?.querySelector('label');
        if (label?.textContent?.includes('Description')) {
          return ta.value || '';
        }
      }
    }

    return '';
  };

  // Helper to extract blog preview
  const getBlogPreview = (): string => {
    const content = getEditorContent();
    const stripped = content
      .replace(/<[^>]+>/g, '')
      .replace(/\{%[^%]*%\}/g, '')
      .replace(/\{[^}]+\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped.substring(0, 1500);
  };

  // Call LLM API with retry logic
  const callLLMAPI = async (operation: string, text: string, attemptNumber: number = 1) => {
    setCurrentAttempt(attemptNumber);
    setModalStatus('loading');
    setIsAutoRetrying(attemptNumber > 1);

    try {
      let requestBody: any;

      // Special handling for description generation
      if (operation === 'generate-description') {
        const title = getTitle();
        const content = getBlogPreview();

        requestBody = {
          operation: 'generate-description',
          title,
          content,
          currentDescription: originalText || undefined,  // Send current description if available
          context: llmContext || undefined,  // Include user's additional context/instructions
        };
      } else if (operation === 'suggest-categories') {
        const title = getTitle();
        const content = getBlogPreview();

        console.log('[LLM] Categories - Title:', title);
        console.log('[LLM] Categories - Content length:', content.length);

        requestBody = {
          operation: 'suggest-categories',
          title,
          content,
          availableCategories: categories,
          allowNew: allowNewSuggestions,
        };
      } else if (operation === 'suggest-tags') {
        const title = getTitle();
        const content = getBlogPreview();

        console.log('[LLM] Tags - Title:', title);
        console.log('[LLM] Tags - Content length:', content.length);

        requestBody = {
          operation: 'suggest-tags',
          title,
          content,
          availableTags: tags,
          allowNew: allowNewSuggestions,
        };
      } else {
        // Standard text operation
        requestBody = {
          text,
          operation,
          context: llmContext || undefined,  // Include user's additional context/instructions
        };
      }

      console.log('[LLM] Sending request to /api/llm/text:', requestBody);
      console.log('[LLM] Request timestamp:', new Date().toISOString());

      const response = await fetch('/api/llm/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[LLM] Response received, status:', response.status);
      console.log('[LLM] Response timestamp:', new Date().toISOString());

      const data = await response.json();

      // Always log the complete API response for debugging
      console.log('[LLM] API Response (full):', JSON.stringify(data, null, 2));

      if (data.success) {
        // Success - reset attempt counter and show result
        console.log('[LLM] Success! Result:', data.result);
        setCurrentAttempt(1);
        setIsAutoRetrying(false);
        setLlmResult(data.result || '');
        setModalStatus('success');
      } else if (data.needsRetry && attemptNumber < maxAttempts) {
        // Validation failed but we can retry
        console.log(`[LLM] Validation failed (attempt ${attemptNumber}/${maxAttempts}):`, data.validationError);
        console.log('[LLM] Raw response:', data.rawResponse);

        // Auto-retry
        setTimeout(() => {
          callLLMAPI(operation, text, attemptNumber + 1);
        }, 500);
      } else if (data.needsRetry && attemptNumber >= maxAttempts) {
        // Max attempts reached
        setIsAutoRetrying(false);
        setLlmError(`Failed after ${maxAttempts} attempts. ${data.validationError || 'Validation failed'}`);
        setModalStatus('error');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      setIsAutoRetrying(false);
      setLlmError(error.message || 'Failed to process text');
      setModalStatus('error');
    }
  };

  // Handle operation button click
  const handleOperation = (operation: LLMOperation) => {
    console.log('[handleOperation] Called with operation:', operation.id);

    if (operation.requiresSelection) {
      const text = selectedText;
      if (!text) {
        alert('Please select some text first');
        return;
      }

      console.log('[handleOperation] Selection-based operation, text length:', text.length);
      // For operations that require selection, show modal with context first
      setCurrentOperation(operation.label);
      setOriginalText(text);
      setLlmContext('');
      setModalVisible(true);
      setModalStatus('idle');
      console.log('[handleOperation] Modal state set to visible');
    }
  };

  // Handle description generation with context
  const handleDescriptionGeneration = () => {
    const currentDesc = getCurrentDescription();
    console.log('Current description found:', currentDesc);
    console.log('Current description length:', currentDesc.length);
    // Put current description in originalText (shown in "Original" section)
    // Leave llmContext empty for optional additional context
    setOriginalText(currentDesc);
    setLlmContext('');
    setCurrentOperation(DESCRIPTION_OPERATION.label);
    setModalVisible(true);
    setModalStatus('idle');
  };

  // Handle modal approval
  const handleApprove = async (result: string) => {
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(result);
      const action = originalText ? 'Replace the selected text with' : 'Paste';
      alert(`Copied to clipboard! ${action} the result in your document.`);
    } catch (e) {
      alert(`Result: ${result}\n\nManually copy this text to your document.`);
    }
  };

  if (!visible) return null;

  const hasSelection = selectedText.length > 0;

  return (
    <>
      <div className="editor-toolbar">
        <div className="editor-toolbar-buttons">
          <span className="editor-toolbar-title">
            <img src="/src/assets/images/admin/robot.svg" alt="AI" className="robot-icon" />&nbsp;AI
          </span>
          {LLM_OPERATIONS.map((op) => {
            const disabled = op.requiresSelection && !hasSelection;
            return (
              <button
                key={op.id}
                className={`editor-toolbar-btn ${disabled ? 'disabled' : ''}`}
                onClick={() => handleOperation(op)}
                disabled={disabled}
                title={op.description}
              >
                <span className="editor-toolbar-btn-icon">{op.icon}</span>
                <span className="editor-toolbar-btn-label">{op.label}</span>
              </button>
            );
          })}
          {hasSelection && (
            <span className="editor-toolbar-selection">
              {selectedText.length} chars
            </span>
          )}
        </div>
      </div>

      {/* LLM Operation Modal */}
      <LLMOperationModal
        visible={modalVisible}
        status={modalStatus}
        operation={currentOperation}
        result={llmResult}
        error={llmError}
        originalText={originalText}
        context={llmContext}
        allowNewSuggestions={allowNewSuggestions}
        currentAttempt={currentAttempt}
        maxAttempts={maxAttempts}
        isAutoRetrying={isAutoRetrying}
        onContextChange={setLlmContext}
        onAllowNewSuggestionsChange={setAllowNewSuggestions}
        onApprove={handleApprove}
        onClose={() => setModalVisible(false)}
        onRetry={() => {
          // Reset attempt counter when manually retrying
          setCurrentAttempt(1);
          setIsAutoRetrying(false);

          if (currentOperation === 'Suggest Categories') {
            callLLMAPI('suggest-categories', '');
          } else if (currentOperation === 'Suggest Tags') {
            callLLMAPI('suggest-tags', '');
          } else if (currentOperation === DESCRIPTION_OPERATION.label) {
            callLLMAPI(DESCRIPTION_OPERATION.id, '');
          } else {
            // For text operations (continue, improve, etc.), use the original text
            const operationId = LLM_OPERATIONS.find(op => op.label === currentOperation)?.id;
            if (operationId) {
              callLLMAPI(operationId, originalText);
            }
          }
        }}
      />
    </>
  );
};

export default EditorToolbar;
