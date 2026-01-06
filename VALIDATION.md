# Validación de meds.json

El proyecto incluye un validador automático para `data/meds.json` que verifica:

## Qué valida

- **Campos obligatorios**: `nombre` en todos los medicamentos
- **Tipos numéricos**: `dosis`, `dosis_kg`, `concentracion_*`, etc. deben ser números válidos
- **Rangos coherentes**: `dosis_min` ≤ `dosis_max`
- **Dosificación**: Cada medicamento debe tener al menos uno de:
  - `dosis` o `dosis_kg` (urgencia/intubación)
  - `dosis_min` y `dosis_max` (perfusiones)
  - `es_volumen_puro: true` (volúmenes directos)
- **Concentraciones**: Arrays de concentración requieren campos numéricos (`conc_mg_ml`, `conc_g_ml`, etc.) y descripción
- **Perfusiones**: `dosis_min` y `dosis_max` obligatorios y > 0

## Cómo usar

### Local (Node.js requerido)
```bash
npm install
npm run validate
```

### En CI/CD
El proyecto incluye un workflow de GitHub Actions que valida automáticamente cambios en `data/meds.json` en pushes y PRs.

### Extender el validador

Edita [scripts/validate-meds.js](scripts/validate-meds.js):

```javascript
// Añadir validación personalizada
function validateCustomRule(med, where, errors) {
  if (condition) {
    err(errors, where, 'mensaje de error');
  }
}

// Llamarlo en main()
validateCustomRule(med, where, errors);
```

## Estructura esperada de data/meds.json

```json
{
  "intubacion": {
    "key": {
      "nombre": "Nombre",
      "dosis_kg": 2,
      "unidad": "mg",
      "presentacion": "...",
      "concentracion_mg_ml": 10,
      "dilucion": "..."
    }
  },
  "urgencia": {
    "key": {
      "nombre": "Nombre",
      "dosis": 0.1,
      "unidad": "mg",
      "presentacion": "...",
      "concentracion_mg_ml": 1.0,
      "dilucion": "..."
    }
  },
  "perfusiones": {
    "category": {
      "key": {
        "nombre": "Nombre",
        "dosis_min": 0.05,
        "dosis_max": 0.3,
        "unidad": "mg/kg/h",
        "presentacion": "...",
        "dilucion": "..."
      }
    }
  }
}
```

## Ejemplo de salida válida

```
✔ meds.json válido
```

## Ejemplo de error

```
Errores de validación encontrados:
 - urgencia.medicamento: nombre faltante
 - perfusiones.grupo.med: dosis_min y dosis_max son obligatorios y numéricos
```

El script sale con código 1 si hay errores (útil para CI).
