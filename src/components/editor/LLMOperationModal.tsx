/** @jsxImportSource react */
/**
 * LLMOperationModal Component - DEV ONLY
 * Shows LLM operation progress, results, and approval UI
 * Automatically excluded from production builds via tree-shaking
 */
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { assertKeystaticContext } from './guards';
import { FocusScope } from '@react-aria/focus';
import { useOverlay, useModal, usePreventScroll } from '@react-aria/overlays';

export type LLMOperationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LLMOperationModalProps {
  visible: boolean;
  status: LLMOperationStatus;
  operation?: string;
  result?: string;
  error?: string;
  originalText?: string;
  context?: string;
  onApprove?: (result: string) => void;
  onReject?: () => void;
  onRetry?: () => void;
  onContextChange?: (context: string) => void;
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
  onApprove,
  onReject,
  onRetry,
  onContextChange,
  onClose,
}) => {
  // Runtime guard: Ensure this component only runs in Keystatic context
  assertKeystaticContext('LLMOperationModal');

  const overlayRef = useRef<HTMLDivElement>(null);
  const [editedResult, setEditedResult] = useState(result || '');
  const [editedContext, setEditedContext] = useState(context || '');
  const [hasGenerated, setHasGenerated] = useState(false);

  // Update edited result when result changes
  useEffect(() => {
    if (result) {
      setEditedResult(result);
    }
  }, [result]);

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

  // React Aria hooks for proper overlay management
  const { overlayProps } = useOverlay(
    {
      isOpen: visible,
      onClose,
      isDismissable: true,
      shouldCloseOnBlur: false,
    },
    overlayRef
  );

  const { modalProps } = useModal();
  usePreventScroll({ isDisabled: !visible });

  if (!visible) return null;

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
    <div className="llm-modal-overlay" onClick={onClose}>
      <FocusScope contain restoreFocus autoFocus>
        <div
          ref={overlayRef}
          className="llm-modal-container"
          onClick={(e) => e.stopPropagation()}
          {...overlayProps}
          {...modalProps}
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
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="llm-modal-loading">
              <div className="llm-spinner" />
              <p>Processing with AI...</p>
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
      </FocusScope>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LLMOperationModal;