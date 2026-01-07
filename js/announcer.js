/**
 * Utility para anunciar mensajes a lectores de pantalla (accesibilidad)
 */

let announcer = null;

function getAnnouncer() {
  if (!announcer) {
    announcer = document.getElementById('ariaAnnouncer');
  }
  return announcer;
}

/**
 * Anuncia un mensaje a lectores de pantalla
 * @param {string} message - Mensaje a anunciar
 * @param {number} delay - Delay antes de anunciar (ms)
 */
export function announce(message, delay = 100) {
  const el = getAnnouncer();
  if (!el) return;

  // Limpiar primero para forzar re-anuncio si es el mismo mensaje
  el.textContent = '';
  
  setTimeout(() => {
    el.textContent = message;
    // Limpiar después de 5 segundos
    setTimeout(() => {
      if (el.textContent === message) {
        el.textContent = '';
      }
    }, 5000);
  }, delay);
}

/**
 * Anuncia resultados de cálculo
 */
export function announceCalculation(section, itemCount) {
  const messages = {
    urgencia: `Se calcularon ${itemCount} medicamentos de urgencia`,
    intubacion: `Se calcularon ${itemCount} medicamentos de intubación`,
    perfusiones: `Se generaron tablas de perfusiones`,
    viaaerea: `Se calcularon parámetros de vía aérea`,
    ventilacion: `Se calcularon parámetros de ventilación`,
    signos: `Se obtuvieron rangos de signos vitales`
  };
  
  announce(messages[section] || `Cálculo completado: ${itemCount} resultados`);
}

/**
 * Anuncia error
 */
export function announceError(message) {
  announce(`Error: ${message}`, 50);
}

/**
 * Anuncia búsqueda
 */
export function announceSearchResults(count) {
  if (count === 0) {
    announce('No se encontraron medicamentos');
  } else {
    announce(`Se encontraron ${count} medicamentos. Use flechas arriba y abajo para navegar`);
  }
}
