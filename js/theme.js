/**
 * Módulo de gestión de tema (light/dark mode)
 * - Detecta preferencia del sistema
 * - Permite toggle manual
 * - Guarda preferencia en localStorage
 */

const THEME_KEY = 'uciped-theme';
const THEME_LIGHT = 'light-mode';
const THEME_DARK = 'dark-mode';

/**
 * Detecta el tema preferido del sistema
 */
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_DARK : THEME_LIGHT;
}

/**
 * Obtiene el tema actual (localStorage > sistema > light)
 */
function getCurrentTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return getSystemTheme();
}

/**
 * Aplica el tema al documento
 */
function applyTheme(theme) {
  const html = document.documentElement;
  
  // Eliminar todas las clases de tema
  html.classList.remove(THEME_LIGHT, THEME_DARK);
  
  // Aplicar el tema seleccionado
  if (theme === THEME_DARK) {
    html.classList.add(THEME_DARK);
  } else {
    html.classList.add(THEME_LIGHT);
  }
  
  // Guardar preferencia
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggle entre light y dark mode
 */
function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  applyTheme(next);
  return next;
}

/**
 * Inicializar tema
 */
function initTheme() {
  const theme = getCurrentTheme();
  applyTheme(theme);
  
  // Escuchar cambios en preferencia del sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Solo aplicar si no hay preferencia guardada
    if (!localStorage.getItem(THEME_KEY)) {
      const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
      applyTheme(newTheme);
    }
  });
}

/**
 * Obtener icono para el botón de toggle
 */
function getThemeIcon() {
  const current = getCurrentTheme();
  return current === THEME_DARK ? 'fa-sun' : 'fa-moon';
}

/**
 * Obtener etiqueta para el botón de toggle
 */
function getThemeLabel() {
  const current = getCurrentTheme();
  return current === THEME_DARK ? 'Light Mode' : 'Dark Mode';
}

export {
  initTheme,
  toggleTheme,
  getCurrentTheme,
  getThemeIcon,
  getThemeLabel,
  THEME_LIGHT,
  THEME_DARK
};
