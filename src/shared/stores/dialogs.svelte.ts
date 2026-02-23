/**
 * Dialog Store — State container (Category 2)
 *
 * Replaces useDialogState + useDialogManager React hooks.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 * Architecture doc §3.A: Module store (global singleton)
 *
 * Single store managing all dialog open/close state.
 */

// ── Single dialog controls (exported as a class for scoped use) ──

export class DialogState {
  #isOpen = $state(false);

  constructor(initialOpen = false) {
    this.#isOpen = initialOpen;
  }

  get isOpen(): boolean { return this.#isOpen; }
  open(): void { this.#isOpen = true; }
  close(): void { this.#isOpen = false; }
  toggle(): void { this.#isOpen = !this.#isOpen; }
}

// ── Dialog Manager (all app dialogs in one store) ──

export type DialogName =
  | 'exportDialog'
  | 'qcDashboard'
  | 'onboardingModal'
  | 'externalImport'
  | 'batchEditor'
  | 'personaSettings'
  | 'commandPalette'
  | 'keyboardShortcuts'
  | 'authDialog'
  | 'storageFullDialog';

class DialogManagerStore {
  readonly exportDialog = new DialogState();
  readonly qcDashboard = new DialogState();
  readonly onboardingModal: DialogState;
  readonly externalImport = new DialogState();
  readonly batchEditor = new DialogState();
  readonly personaSettings = new DialogState();
  readonly commandPalette = new DialogState();
  readonly keyboardShortcuts = new DialogState();
  readonly authDialog = new DialogState();
  readonly storageFullDialog = new DialogState();

  constructor() {
    // Onboarding modal opens if setup not complete
    const setupComplete = typeof localStorage !== 'undefined'
      ? !!localStorage.getItem('iiif-field-setup-complete')
      : true;
    this.onboardingModal = new DialogState(!setupComplete);
  }

  /** Close all dialogs */
  closeAll(): void {
    this.exportDialog.close();
    this.qcDashboard.close();
    this.onboardingModal.close();
    this.externalImport.close();
    this.batchEditor.close();
    this.personaSettings.close();
    this.commandPalette.close();
    this.keyboardShortcuts.close();
    this.authDialog.close();
    this.storageFullDialog.close();
  }

  /** Check if any dialog is open (useful for keyboard shortcut suppression) */
  get anyOpen(): boolean {
    return (
      this.exportDialog.isOpen ||
      this.qcDashboard.isOpen ||
      this.onboardingModal.isOpen ||
      this.externalImport.isOpen ||
      this.batchEditor.isOpen ||
      this.personaSettings.isOpen ||
      this.commandPalette.isOpen ||
      this.keyboardShortcuts.isOpen ||
      this.authDialog.isOpen ||
      this.storageFullDialog.isOpen
    );
  }
}

/** Global singleton */
export const dialogs = new DialogManagerStore();
