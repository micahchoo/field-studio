import { useDialogState, type DialogControls } from '@/src/shared/lib/hooks/useDialogState';

export interface DialogManager {
  exportDialog: DialogControls;
  qcDashboard: DialogControls;
  onboardingModal: DialogControls;
  externalImport: DialogControls;
  batchEditor: DialogControls;
  personaSettings: DialogControls;
  commandPalette: DialogControls;
  keyboardShortcuts: DialogControls;
  authDialog: DialogControls;
  storageFullDialog: DialogControls;
}

export function useDialogManager(): DialogManager {
  const exportDialog = useDialogState();
  const qcDashboard = useDialogState();
  const onboardingModal = useDialogState(!localStorage.getItem('iiif-field-setup-complete'));
  const externalImport = useDialogState();
  const batchEditor = useDialogState();
  const personaSettings = useDialogState();
  const commandPalette = useDialogState();
  const keyboardShortcuts = useDialogState();
  const authDialog = useDialogState();
  const storageFullDialog = useDialogState();

  return {
    exportDialog,
    qcDashboard,
    onboardingModal,
    externalImport,
    batchEditor,
    personaSettings,
    commandPalette,
    keyboardShortcuts,
    authDialog,
    storageFullDialog,
  };
}
