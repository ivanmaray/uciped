/**
 * Utility para gestionar el trap de foco en modales (accesibilidad)
 * Mantiene el foco dentro del modal cuando está abierto
 */

export function setupFocusTrap(modalElement) {
  if (!modalElement) return;

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

  // Observar cuando el modal se muestra/oculta
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        const isVisible = !modalElement.classList.contains('hidden') && 
                         (modalElement.classList.contains('active') || !modalElement.classList.contains('modal'));
        
        if (isVisible) {
          modalElement.addEventListener('keydown', onKeyDown);
          // Enfocar el primer elemento enfocable
          setTimeout(() => {
            const focusable = getFocusableElements();
            if (focusable.length > 0) focusable[0].focus();
          }, 100);
        } else {
          modalElement.removeEventListener('keydown', onKeyDown);
        }
      }
    });
  });

  observer.observe(modalElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  return () => {
    observer.disconnect();
    modalElement.removeEventListener('keydown', onKeyDown);
  };
}
