/** @jsxImportSource react */
/**
 * LLMOperationModal Component - DEV ONLY
 * Shows LLM operation progress, results, and approval UI
 * Standalone modal that works without Keystatic React context
 * Automatically excluded from production builds via tree-shaking
 */
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export type LLMOperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LLMOperationModalProps {
  visible: boolean;
  status: LLMOperationStatus;
  operation?: string;
  result?: string | string[];  // Can be string for text operations or array for tags/categories
  error?: string;
  originalText?: string;
  context?: string;
  allowNewSuggestions?: boolean;
  currentAttempt?: number;
  maxAttempts?: number;
  isAutoRetrying?: boolean;
  onApprove?: (result: string) => void;
  onReject?: () => void;
  onRetry?: () => void;
  onContextChange?: (context: string) => void;
  onAllowNewSuggestionsChange?: (allow: boolean) => void;
  onClose: () => void;
}

export const LLMOperationModal: React.FC<LLMOperationModalProps> = ({
  visible,
  status,
  operation = 'Processing',
  result,
  error,
  originalText,
  context,
  allowNewSuggestions = false,
  currentAttempt = 1,
  maxAttempts = 5,
  isAutoRetrying = false,
  onApprove,
  onReject,
  onRetry,
  onContextChange,
  onAllowNewSuggestionsChange,
  onClose,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Find the Keystatic modal container to portal into
  useEffect(() => {
    if (visible) {
      // Look for Keystatic's modal container
      const ksModal = document.querySelector('[data-type="modal"][data-open="true"]') as HTMLElement;
      if (ksModal) {
        setPortalContainer(ksModal);
      } else {
        // Fallback to body
        setPortalContainer(document.body);
      }
    }
  }, [visible]);

  // Convert array results to string for display (join with newlines for tags/categories)
  const resultToString = (r: string | string[] | undefined): string => {
    if (!r) return '';
    if (Array.isArray(r)) return r.join('\n');
    return r;
  };
  const [editedResult, setEditedResult] = useState(resultToString(result));
  const [editedContext, setEditedContext] = useState(context || '');
  const [hasGenerated, setHasGenerated] = useState(false);

  // Update edited result when result changes
  useEffect(() => {
    if (result) {
      setEditedResult(resultToString(result));
    }
  }, [result]);

  // Update edited context when context prop changes
  useEffect(() => {
    setEditedContext(context || '');
  }, [context]);

  // Mark as generated when we get a successful result
  useEffect(() => {
    if (status === 'success' && result) {
      setHasGenerated(true);
    }
  }, [status, result]);

  // Reset hasGenerated when modal closes
  useEffect(() => {
    if (!visible) {
      setHasGenerated(false);
    }
  }, [visible]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [visible]);

  // Handle ESC key to close
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [visible, onClose]);

  if (!visible || !portalContainer) {
    return null;
  }

  const handleApprove = () => {
    if (onApprove && editedResult) {
      onApprove(editedResult);
    }
    onClose();
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
    }
    onClose();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const handleContextChange = (newContext: string) => {
    setEditedContext(newContext);
    if (onContextChange) {
      onContextChange(newContext);
    }
  };

  const handleGenerate = () => {
    if (onRetry) {
      onRetry();
    }
  };

  const modalContent = (
    <div ref={overlayRef} className="llm-modal-overlay">
      <div
        className="llm-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="llm-modal-title"
      >
        {/* Header */}
        <div className="llm-modal-header">
          <h3 className="llm-modal-title">{operation}</h3>
          <button
            className="llm-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="llm-modal-content">
          {/* Idle State - Context Input */}
          {status === 'idle' && (
            <div className="llm-modal-idle">
              {/* Show checkbox for category/tag suggestions */}
              {(operation === 'Suggest Categories' || operation === 'Suggest Tags') && onAllowNewSuggestionsChange && (
                <div className="llm-comparison-section" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowNewSuggestions}
                      onChange={(e) => onAllowNewSuggestionsChange(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Allow suggesting new {operation === 'Suggest Categories' ? 'categories' : 'tags'}</span>
                  </label>
                  <p className="llm-edit-hint" style={{ marginTop: '4px', marginLeft: '24px' }}>
                    {allowNewSuggestions
                      ? `The AI can suggest new ${operation === 'Suggest Categories' ? 'categories' : 'tags'} if existing ones don't fit well`
                      : `The AI will only suggest from the existing list of ${operation === 'Suggest Categories' ? 'categories' : 'tags'}`
                    }
                  </p>
                </div>
              )}

              {/* Show context input for non-category/tag operations */}
              {operation !== 'Suggest Categories' && operation !== 'Suggest Tags' && (
                <div className="llm-comparison-section">
                  <h4 className="llm-section-title">Context (Optional)</h4>
                  <textarea
                    className="llm-text-edit"
                    value={editedContext}
                    onChange={(e) => handleContextChange(e.target.value)}
                    rows={Math.min(10, Math.max(4, editedContext.split('\n').length + 2))}
                    placeholder="Add context to help the AI understand the image better (e.g., selected text from your document)..."
                  />
                  <p className="llm-edit-hint">
                    Provide context about where this image appears or what it relates to
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="llm-modal-loading">
              <div className="llm-spinner" />
              <p>Processing with AI...</p>
              {isAutoRetrying && currentAttempt > 1 && (
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                  Attempt {currentAttempt}/{maxAttempts}
                </p>
              )}
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="llm-modal-error">
              <div className="llm-error-icon">⚠️</div>
              <h4>Operation Failed</h4>
              <p className="llm-error-message">{error || 'An unknown error occurred'}</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && result && (
            <div className="llm-modal-success">
              {/* Original Text (if provided) */}
              {originalText && (
                <div className="llm-comparison-section">
                  <h4 className="llm-section-title">Original</h4>
                  <div className="llm-text-display llm-original-text">
                    {originalText}
                  </div>
                </div>
              )}

              {/* Generated Result */}
              <div className="llm-comparison-section">
                <h4 className="llm-section-title">
                  {originalText ? 'AI Suggestion' : 'Result'}
                </h4>
                <textarea
                  className="llm-text-edit"
                  value={editedResult}
                  onChange={(e) => setEditedResult(e.target.value)}
                  rows={Math.min(15, editedResult.split('\n').length + 2)}
                  placeholder="AI generated content will appear here..."
                />
                <p className="llm-edit-hint">
                  You can edit the text above before applying
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="llm-modal-footer">
          {status === 'idle' && (
            <>
              <button className="llm-btn llm-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="llm-btn llm-btn-primary" onClick={handleGenerate}>
                {hasGenerated ? 'Regenerate' : 'Generate'}
              </button>
            </>
          )}

          {status === 'loading' && (
            <button className="llm-btn llm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}

          {status === 'error' && (
            <>
              {onRetry && (
                <button className="llm-btn llm-btn-primary" onClick={handleRetry}>
                  Try Again
                </button>
              )}
              <button className="llm-btn llm-btn-secondary" onClick={onClose}>
                Close
              </button>
            </>
          )}

          {status === 'success' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="llm-btn llm-btn-secondary" onClick={handleReject}>
                  Reject
                </button>
                <button
                  className="llm-btn llm-btn-primary"
                  onClick={handleApprove}
                  disabled={!editedResult.trim()}
                >
                  Apply
                </button>
              </div>
              {onRetry && (
                <button className="llm-btn llm-btn-secondary" onClick={handleRetry}>
                  Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalContainer);
};

export default LLMOperationModal;