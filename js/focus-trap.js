/**
 * Utility para gestionar el trap de foco en modales (accesibilidad)
 * Mantiene el foco dentro del modal cuando está abierto
 */

export function setupFocusTrap(modalElement) {
  if (!modalElement) return;

  let isOpen = false;
  let previouslyFocused = null;
  let focusTimer = null;

  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getFocusableElements() {
    return Array.from(modalElement.querySelectorAll(focusableSelectors))
      .filter(el => el.offsetParent !== null); // solo elementos visibles
  }

  function handleTabKey(e) {
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Tab') {
      handleTabKey(e);
    } else if (e.key === 'Escape') {
      // Permitir cerrar modal con Escape
      const closeBtn = modalElement.querySelector('.modal-close, .dosis-modal-close, .med-detail-close');
      if (closeBtn) closeBtn.click();
    }
  }

  function isModalVisible() {
    if (modalElement.classList.contains('hidden')) return false;
    return window.getComputedStyle(modalElement).display !== 'none';
  }

  function restoreFocus() {
    if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  function syncModalState() {
    const visible = isModalVisible();

    if (visible && !isOpen) {
      isOpen = true;
      previouslyFocused = document.activeElement;
      modalElement.addEventListener('keydown', onKeyDown);
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) focusable[0].focus();
      }, 0);
    } else if (!visible && isOpen) {
      isOpen = false;
      modalElement.removeEventListener('keydown', onKeyDown);
      clearTimeout(focusTimer);
      restoreFocus();
    }
  }

  // Observar cuando el modal se muestra/oculta
  const observer = new MutationObserver(syncModalState);

  observer.observe(modalElement, {
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  // El aviso legal puede estar ya visible cuando se inicializa el gestor.
  syncModalState();

  return () => {
    observer.disconnect();
    modalElement.removeEventListener('keydown', onKeyDown);
    clearTimeout(focusTimer);
    if (isOpen) restoreFocus();
  };
}
