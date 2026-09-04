# ADR-010: Reportes De Hallazgos Confirmados

## Contexto

Una sesión puede incluir candidatos pendientes, descartes y duplicados que no deben presentarse como bugs al compartir un reporte. El revisor necesita revisar el resumen antes de finalizar y exportar el resultado desde la extensión.

## Decisión

El servicio expone un reporte de sesión que calcula el resumen sobre todos los hallazgos y genera JSON, Markdown y HTML usando únicamente hallazgos confirmados. La extensión muestra los conteos de cierre, advierte sobre candidatos pendientes y permite descargar cada formato.

## Consecuencias

- Los reportes externos no confunden candidatos o descartes con bugs confirmados.
- El resumen conserva la trazabilidad completa de la revisión.
- Finalizar con pendientes requiere una confirmación explícita.
