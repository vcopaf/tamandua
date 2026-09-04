# ADR-012: UI Con Tailwind Y Texto Semántico

## Contexto

El panel lateral necesitaba una jerarquía visual más clara para la revisión lingüística. Además, la extracción de todo texto visible incluía icon fonts y metadatos técnicos, generando falsos positivos de LanguageTool.

## Decisión

La extensión usa Tailwind CSS compilado por Vite/WXT para definir los componentes visuales del panel. La revisión continua se presenta en la vista Ortografía, junto con la revisión manual.

Antes de enviar bloques al servicio lingüístico, la extensión excluye contenido semánticamente no lingüístico: iconos Material, nodos ocultos por ARIA, elementos de presentación, contenido no traducible, etiquetas técnicas y tokens aislados con guiones bajos o guiones.

## Consecuencias

- La interfaz mantiene estilos consistentes sin incorporar un framework de UI ni React.
- Los proveedores lingüísticos reciben menos ruido y producen menos candidatos falsos.
- El filtrado ocurre en el navegador, por lo que el servicio local solo procesa texto relevante de la página.
