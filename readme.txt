# 📊 Generador de Horarios - Ingeniería Industrial

Una aplicación web moderna y responsiva para generar horarios académicos sin conflictos para estudiantes de Ingeniería Industrial.

## 🚀 Características

### ✨ Funcionalidades Principales
- **Selección Inteligente de Cursos**: Selecciona semestres y cursos con validación automática de paridad
- **Configuración de Horarios**: Interface intuitiva para configurar múltiples grupos y horarios por curso
- **Generación Automática**: Algoritmo que genera todas las combinaciones válidas sin choques horarios
- **Visualización Avanzada**: Vista previa de horarios con diseño tipo diagrama industrial
- **Exportación Múltiple**: Exporta horarios en PDF e imágenes PNG
- **Gestión de Configuración**: Guarda y carga configuraciones en formato JSON

### 🎨 Diseño
- **Estilo Industrial**: Paleta de colores inspirada en líneas de metro/subterráneo
- **Completamente Responsivo**: Optimizado para desktop, tablet y móvil
- **Interfaz Moderna**: Diseño minimalista con elementos redondeados
- **Animaciones Suaves**: Transiciones fluidas y feedback visual
- **Accesibilidad**: Contrastes adecuados y navegación intuitiva

## 📋 Plan de Estudios

El sistema incluye el plan de estudios completo 2017 de Ingeniería Industrial:

- **5 Años Académicos** (10 semestres)
- **70+ Cursos** con códigos y créditos
- **Validación de Prerrequisitos** por semestre par/impar
- **Cursos Electivos** claramente identificados

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica moderna
- **CSS3**: Variables CSS, Grid, Flexbox, animaciones
- **JavaScript ES6+**: Programación funcional y orientada a objetos
- **jsPDF**: Generación de documentos PDF
- **html2canvas**: Captura de elementos DOM como imágenes

## 📁 Estructura del Proyecto

```
schedule-generator/
│
├── index.html          # Página principal
├── styles.css          # Estilos principales
├── script.js           # Lógica de la aplicación
├── data.js             # Plan de estudios y datos
├── README.md           # Documentación
└── assets/             # Recursos adicionales (si los hay)
```

## 🚀 Instalación y Uso

### Para GitHub Pages:

1. **Clonar o descargar** el repositorio
2. **Subir archivos** a tu repositorio de GitHub
3. **Activar GitHub Pages** en la configuración del repositorio
4. **Acceder** a tu aplicación en `https://tu-usuario.github.io/nombre-repositorio`

### Para desarrollo local:

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/schedule-generator.git

# Navegar al directorio
cd schedule-generator

# Abrir con Live Server o cualquier servidor local
# O simplemente abrir index.html en el navegador
```

## 📖 Guía de Uso

### 1. Selección de Cursos
1. **Selecciona semestres** que deseas cursar (solo pares o impares)
2. **Marca los cursos** que planeas tomar
3. **Observa el contador** de créditos en tiempo real

### 2. Configuración de Horarios
1. **Selecciona un curso** de la lista desplegable
2. **Habilita grupos** (A, B, C, D, E, F) que estén disponibles
3. **Agrega horarios** especificando día, hora de inicio y fin
4. **Guarda la configuración** antes de pasar al siguiente curso

### 3. Generación de Horarios
1. **Genera combinaciones** haciendo clic en el botón principal
2. **Revisa la lista** de combinaciones válidas encontradas
3. **Previsualiza** cada combinación para ver el horario
4. **Selecciona** las combinaciones que deseas exportar

### 4. Exportación
- **PDF**: Exporta múltiples combinaciones en un solo documento
- **PNG**: Exporta la combinación actual como imagen
- **JSON**: Guarda tu configuración completa para uso posterior

## 🎨 Paleta de Colores

La aplicación utiliza una paleta inspirada en sistemas de transporte metropolitano:

- **Primario**: `#2563eb` (Azul sistema)
- **Secundario**: `#7c3aed` (Púrpura técnico)
- **Acento**: `#059669` (Verde operativo)
- **Cursos**: 10 colores distintos para fácil identificación

## ⚡ Características Técnicas

### Algoritmo de Generación
- **Producto Cartesiano**: Genera todas las combinaciones posibles
- **Validación de Conflictos**: Detecta choques de horario automáticamente
- **Optimización**: Filtra combinaciones inválidas en tiempo real

### Responsive Design
- **Mobile First**: Diseño que se adapta desde móvil hacia desktop
- **Breakpoints**: 480px, 768px, 1024px
- **Navegación**: Tabs que se convierten en accordion en móvil

### Accesibilidad
- **Contraste**: Cumple con estándares WCAG AA
- **Keyboard Navigation**: Totalmente navegable con teclado
- **Screen Readers**: Labels y ARIA attributes apropiados

## 🔧 Personalización

### Modificar Plan de Estudios
Edita el archivo `data.js` para cambiar:
- Semestres disponibles
- Cursos y créditos
- Horarios predeterminados

### Cambiar Colores
Modifica las variables CSS en `styles.css`:
```css
:root {
    --primary-color: #tu-color;
    --course-color-1: #color-curso-1;
    /* ... más colores */
}
```

### Agregar Funcionalidades
Extiende `script.js` para añadir:
- Nuevas validaciones
- Tipos de exportación
- Integraciones con APIs

## 🐛 Resolución de Problemas

### Problemas Comunes:

**No se generan combinaciones:**
- Verifica que todos los cursos tengan horarios configurados
- Revisa que no haya conflictos irresolubles entre horarios obligatorios

**Error al exportar PDF:**
- Asegúrate de que el navegador permita descargas
- Verifica que no haya bloqueadores de pop-ups activos

**La aplicación no carga:**
- Verifica que todos los archivos estén en la misma carpeta
- Asegúrate de que el servidor permita archivos JavaScript

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Para contribuir:

1. **Fork** el repositorio
2. **Crea** una branch para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la branch (`git push origin feature/nueva-funcionalidad`)
5. **Abre** un Pull Request

### Áreas de mejora:
- [ ] Integración con sistemas de gestión académica
- [ ] Notificaciones push para cambios de horario
- [ ] Modo offline con Service Workers
- [ ] Análisis de carga horaria y balance
- [ ] Integración con calendarios (Google Calendar, Outlook)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

Desarrollado con ❤️ para estudiantes de Ingeniería Industrial.

## 🙏 Agradecimientos

- Inspirado en sistemas de gestión académica modernos
- Paleta de colores basada en sistemas de transporte metropolitano
- Diseño UX inspirado en herramientas de productividad industriales

---

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:
- 🐛 **Reporta bugs** en GitHub Issues
- 💡 **Sugiere features** en GitHub Discussions
- 📧 **Contacto directo** a través del perfil de GitHub

---

**¡Esperamos que esta herramienta te ayude a organizar mejor tu horario académico! 🎓**