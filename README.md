# UCI Pediatría - Calculadora Clínica Mejorada

Una aplicación web moderna y responsiva para cálculos pediátricos diseñada para profesionales de la salud.

## 🎯 Características

### ✅ Funcionalidades Principales

1. **Estimación de Peso**
   - Calcula el peso estimado según la edad del paciente
   - Utiliza fórmulas pediátricas estándar
   - Soporta rangos de 0 a 18 años

2. **Cálculo de Dosificación**
   - Calcula dosis de medicamentos según el peso
   - Base de datos de medicamentos comunes
   - Muestra máximos recomendados
   - Intervalos de administración

3. **Valores de Signos Vitales**
   - Referencia de valores normales por edad
   - Frecuencia cardíaca, respiratoria, PA
   - Rápido acceso a parámetros normales

4. **Fórmulas de Referencia**
   - Colección completa de fórmulas pediátricas
   - IMC, superficie corporal
   - Cálculo de líquidos y calorías
   - Referencia de sondas endotraqueales

5. **Algoritmo de Hiperpotasemia**
   - Clasificación por potasio, ECG y umbral neonatal
   - Dosis calculadas de calcio, insulina/glucosa y salbutamol IV
   - Salbutamol nebulizado según ERC 2025
   - Estrategias de eliminación y bicarbonato condicionado a acidosis

## 🛠️ Mejoras Implementadas

### vs Versión Original

| Aspecto | Original | Mejorada |
|--------|----------|-----------|
| Diseño | Básico | Moderno y gradientes |
| Responsividad | Limitada | Totalmente responsiva (mobile-first) |
| Funcionalidades | Solo peso | 4 secciones completas |
| UX/UI | Minimal | Intuitiva y atractiva |
| Animaciones | Ninguna | Transiciones suaves |
| Documentación | Escasa | Completa |
| Medicamentos | No disponible | Base de datos integrada |
| Signos vitales | No disponible | Referencia por edad |

## 🚀 Inicio Rápido

### Requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Node.js para ejecutar las validaciones automatizadas

### Uso
1. Sirve la carpeta desde un servidor HTTP (`npm run dev` o equivalente)
2. Selecciona la pestaña deseada
3. Ingresa los datos requeridos
4. Presiona "Calcular" o Enter
5. Visualiza los resultados

## 📱 Diseño Responsivo

- **Desktop**: Interfaz completa con iconos
- **Tablet**: Optimizado para pantallas medianas
- **Mobile**: Versión compacta y accesible

## 🎨 Paleta de Colores

```
Primario: #2563eb (Azul)
Secundario: #10b981 (Verde)
Fondo: #f8fafc (Gris claro)
Texto: #1e293b (Gris oscuro)
```

## 📊 Fórmulas Utilizadas

### Estimación de Peso
- **0-12 meses**: Peso = 3.5 + (meses × 0.5)
- **1-3 años**: Peso = (edad + 9) × 2
- **3-6 años**: Peso = (edad × 2) + 8
- **6-12 años**: Peso = (edad × 3) + 7
- **>12 años**: Peso = (edad × 3.5) + 10

### Medicamentos Incluidos
- Medicación de urgencia
- Medicación para intubación
- Perfusiones de inotrópicos, sedoanalgesia e insulina

Los valores se mantienen en `data/meds.json` y deben validarse frente al
protocolo institucional antes de utilizarse en asistencia clínica.

## ⚠️ Descargo de Responsabilidad

**Esta herramienta es una calculadora de referencia únicamente.** 

- Siempre consulta con profesionales médicos calificados
- No reemplaza el criterio clínico profesional
- Verifica resultados con protocolos institucionales
- Los valores son aproximaciones basadas en estándares médicos

## 🔧 Estructura del Proyecto

```
uciped/
├── data/meds.json              # Datos de medicamentos
├── js/                         # Estado, interfaz y motores de cálculo
├── scripts/validate-meds.js    # Validador de datos
├── tests/logic.test.mjs        # Pruebas de cálculos y regresión
├── index.html                  # Estructura HTML
├── styles.css                  # Estilos responsivos e iconos locales
├── sw.js                       # Caché y funcionamiento offline
└── README.md                   # Documentación
```

## 💻 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Grid, Flexbox, gradientes, animaciones
- **JavaScript (Vanilla)**: Sin dependencias externas
- **Iconos CSS locales**: sin dependencia de CDN

## 🎯 Funcionalidades Planeadas

- [ ] Guardado de historial de cálculos
- [ ] Exportar resultados a PDF
- [ ] Base de datos expandida de medicamentos
- [ ] Cálculo de reposición de fluidos
- [ ] Gráficos de crecimiento
- [x] Modo offline mediante Service Worker
- [ ] Idioma inglés
- [ ] Sincronización con registros médicos

## 📝 Notas de Desarrollo

### Extensibilidad
El código está estructurado para facilitar:
- Agregar nuevos medicamentos
- Incluir más fórmulas
- Expandir rangos de edad
- Integración con APIs médicas

### Performance
- Carga rápida (sin dependencias pesadas)
- Animaciones optimizadas
- Totalmente funcional offline

## 👨‍⚕️ Caso de Uso

Perfect para:
- Estudiantes de medicina y enfermería
- Profesionales en urgencias pediátricas
- Consultorio pediátrico
- Formación médica continua

## 📞 Soporte

Para reportar errores o sugerencias, contacta con el equipo de desarrollo.

---

**Versión**: 1.0.9<br>
**Última actualización**: 30 de agosto de 2026<br>
**Licencia**: MIT

⚕️ *Calculadora Clínica Pediátrica Profesional*
