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
- No requiere instalación de dependencias

### Uso
1. Abre `index.html` en tu navegador
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
- Ibuprofeno: 10 mg/kg
- Paracetamol: 15 mg/kg
- Amoxicilina: 25-45 mg/kg/día
- Ceftriaxona: 50-80 mg/kg/día
- Penicilina: 25-50 mil U/kg/día

## ⚠️ Descargo de Responsabilidad

**Esta herramienta es una calculadora de referencia únicamente.** 

- Siempre consulta con profesionales médicos calificados
- No reemplaza el criterio clínico profesional
- Verifica resultados con protocolos institucionales
- Los valores son aproximaciones basadas en estándares médicos

## 🔧 Estructura del Proyecto

```
uciped/
├── index.html      # Estructura HTML
├── styles.css      # Estilos y diseño responsivo
├── script.js       # Lógica y funcionalidades
└── README.md       # Este archivo
```

## 💻 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Grid, Flexbox, gradientes, animaciones
- **JavaScript (Vanilla)**: Sin dependencias externas
- **Font Awesome**: Iconos (CDN)

## 🎯 Funcionalidades Planeadas

- [ ] Guardado de historial de cálculos
- [ ] Exportar resultados a PDF
- [ ] Base de datos expandida de medicamentos
- [ ] Cálculo de reposición de fluidos
- [ ] Gráficos de crecimiento
- [ ] Modo offline
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

**Versión**: 1.0.0  
**Última actualización**: 16 de diciembre de 2024  
**Licencia**: MIT

⚕️ *Calculadora Clínica Pediátrica Profesional*
