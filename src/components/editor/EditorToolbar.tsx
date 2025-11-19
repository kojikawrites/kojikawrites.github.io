/** @jsxImportSource react */
/**
 * EditorToolbar Component - DEV ONLY
 * Provides quick access to LLM text operations
 * Automatically excluded from production builds via tree-shaking
 */
import React, { useState } from 'react';
import { assertKeystaticContext } from './guards';
import { LLMOperationModal, type LLMOperationStatus } from './LLMOperationModal';

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
    description: 'Continue writing from cursor position',
    requiresSelection: false,
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

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ visible = true }) => {
  // Runtime guard: Ensure this component only runs in Keystatic context
  assertKeystaticContext('EditorToolbar');

  const [selectedText, setSelectedText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<LLMOperationStatus>('idle');
  const [currentOperation, setCurrentOperation] = useState('');
  const [llmResult, setLlmResult] = useState('');
  const [llmError, setLlmError] = useState('');
  const [originalText, setOriginalText] = useState('');

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

  // Call LLM API
  const callLLMAPI = async (operation: string, text: string) => {
    setModalStatus('loading');

    try {
      const response = await fetch('/api/llm/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          operation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLlmResult(data.result || '');
        setModalStatus('success');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      setLlmError(error.message || 'Failed to process text');
      setModalStatus('error');
    }
  };

  // Handle operation button click
  const handleOperation = (operation: LLMOperation) => {
    const text = operation.requiresSelection ? selectedText : '';

    if (operation.requiresSelection && !text) {
      alert('Please select some text first');
      return;
    }

    setCurrentOperation(operation.label);
    setOriginalText(text);
    setModalVisible(true);
    setModalStatus('loading');
    callLLMAPI(operation.id, text);
  };

  // Handle modal approval
  const handleApprove = async (result: string) => {
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(result);
      // If there was selected text, we could replace it here
      // For now, just notify user to paste
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
        <div className="editor-toolbar-header">
          <span className="editor-toolbar-title">🤖 AI Writing Tools</span>
          {hasSelection && (
            <span className="editor-toolbar-selection">
              {selectedText.length} chars selected
            </span>
          )}
        </div>
        <div className="editor-toolbar-buttons">
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
        onApprove={handleApprove}
        onClose={() => setModalVisible(false)}
        onRetry={() => callLLMAPI(currentOperation.toLowerCase(), originalText)}
      />
    </>
  );
};

export default EditorToolbar;