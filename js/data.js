let medsPromise = null;

export function loadMeds() {
  if (medsPromise) return medsPromise;

  medsPromise = (async () => {
    try {
      const res = await fetch('./data/meds.json', { cache: 'no-cache' });
      if (!res.ok) {
        console.error('Error HTTP al cargar meds.json:', res.status, res.statusText);
        throw new Error('No se pudo cargar meds.json');
      }
      const data = await res.json();
      return normalizeMeds(data);
    } catch (e) {
      console.warn('Fallo cargando meds.json; se bloquean las tablas farmacológicas:', e.message);
      return null;
    }
  })();

  return medsPromise;
}

function normalizeMeds(data) {
  if (!data || typeof data !== 'object') return data;
  const ensureFields = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('nombre' in val) {
          if (!('presentacion' in val)) val.presentacion = 'Revisar presentación';
        } else {
          ensureFields(val);
        }
      }
    });
  };
  ensureFields(data);
  return data;
}
