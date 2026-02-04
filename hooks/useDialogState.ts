/**
 * Dialog State Management Hook
 *
 * Manages open/close state for dialogs and modals.
 * Can track multiple dialogs with a single state object.
 */

import { useCallback, useMemo, useState } from 'react';

interface DialogControls {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Single dialog state management
 */
export function useDialogState(initialOpen: boolean = false): DialogControls {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}

/**
 * Multiple dialog state management
 * Usage:
 *   const dialogs = useDialogsState(['export', 'settings', 'qc'] as const);
 *   dialogs.export.open();
 *   dialogs.settings.isOpen;
 */
export function useDialogsState<T extends readonly string[]>(
  dialogNames: T
): Record<T[number], DialogControls> {
  const [openDialogs, setOpenDialogs] = useState<Set<string>>(new Set());

  const createControls = useCallback(
    (name: string): DialogControls => ({
      isOpen: openDialogs.has(name),
      open: () => setOpenDialogs(prev => new Set([...prev, name])),
      close: () => setOpenDialogs(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      }),
      toggle: () => setOpenDialogs(prev => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
        }
        return next;
      }),
    }),
    [openDialogs]
  );

  const dialogs = useMemo(() => {
    const result = {} as Record<T[number], DialogControls>;
    for (const name of dialogNames) {
      result[name as T[number]] = createControls(name);
    }
    return result;
  }, [dialogNames, createControls]);

  return dialogs;
}

export default useDialogState;
