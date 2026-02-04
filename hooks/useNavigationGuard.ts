/**
 * useNavigationGuard - Prevents navigation when there are unsaved changes
 * 
 * Addresses Issue 3.1: Metadata Spreadsheet unsaved changes warning
 * Provides in-app navigation blocking with confirmation dialogs
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface NavigationGuardOptions {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Message to show in confirmation dialog */
  confirmMessage?: string;
  /** Callback when user confirms navigation */
  onConfirm?: () => void;
  /** Callback when user cancels navigation */
  onCancel?: () => void;
}

interface NavigationGuardReturn {
  /** Whether the confirmation dialog is showing */
  isConfirming: boolean;
  /** The pending navigation action */
  pendingAction: (() => void) | null;
  /** Request navigation (will trigger confirmation if needed) */
  requestNavigation: (action: () => void) => boolean;
  /** Confirm the pending navigation */
  confirm: () => void;
  /** Cancel the pending navigation */
  cancel: () => void;
  /** Reset the guard state */
  reset: () => void;
}

export function useNavigationGuard({
  hasUnsavedChanges,
  confirmMessage = 'You have unsaved changes. Are you sure you want to leave?',
  onConfirm,
  onCancel
}: NavigationGuardOptions): NavigationGuardReturn {
  const [isConfirming, setIsConfirming] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  
  // Handle browser beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = confirmMessage;
        return confirmMessage;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, confirmMessage]);
  
  const requestNavigation = useCallback((action: () => void): boolean => {
    if (!hasUnsavedChanges) {
      // No unsaved changes, proceed immediately
      action();
      return true;
    }
    
    // Store the action and show confirmation
    pendingActionRef.current = action;
    setIsConfirming(true);
    return false;
  }, [hasUnsavedChanges]);
  
  const confirm = useCallback(() => {
    setIsConfirming(false);
    onConfirm?.();
    
    // Execute the pending action
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }
  }, [onConfirm]);
  
  const cancel = useCallback(() => {
    setIsConfirming(false);
    pendingActionRef.current = null;
    onCancel?.();
  }, [onCancel]);
  
  const reset = useCallback(() => {
    setIsConfirming(false);
    pendingActionRef.current = null;
  }, []);
  
  return {
    isConfirming,
    pendingAction: pendingActionRef.current,
    requestNavigation,
    confirm,
    cancel,
    reset
  };
}

export default useNavigationGuard;
