export async function loadMeds() {
  try {
    const res = await fetch('./data/meds.json');
    if (!res.ok) {
      console.error('Error HTTP al cargar meds.json:', res.status, res.statusText);
      throw new Error('Failed to load meds.json');
    }
    const data = await res.json();
    console.log('meds.json recibido con claves:', Object.keys(data || {}));
    return normalizeMeds(data);
  } catch (e) {
    console.warn('Fallo cargando meds.json, usando fallback en memoria:', e.message);
    return null;
  }
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
          if (!('dilucion' in val)) val.dilucion = 'Revisar dilución';
        } else {
          ensureFields(val);
        }
      }
    });
  };
  ensureFields(data);
  return data;
}
