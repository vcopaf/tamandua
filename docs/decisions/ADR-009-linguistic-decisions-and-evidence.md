# ADR-009: Decisiones Lingüísticas Y Evidencia Explícita

## Contexto

Los resultados lingüísticos necesitan conservar decisiones humanas para no reaparecer innecesariamente. Los hallazgos confirmados también requieren evidencia que el revisor pueda reutilizar sin activar capturas continuas.

## Decisión

Un resultado marcado como No es bug se persiste como hallazgo descartado dentro de la sesión. Los términos pueden ignorarse en el contexto del proyecto o globalmente por idioma mediante `global_linguistic_ignores`. Ambos proveedores lingüísticos reciben los ignorados combinados.

La evidencia visual se captura únicamente mediante una acción explícita desde el hallazgo. La extensión permite guardarla, copiarla al portapapeles o descargarla como PNG.

## Consecuencias

- Los descartes y términos ignorados reducen repetición sin ocultar reglas de redacción generales de forma global.
- LanguageTool y las reglas locales respetan los mismos términos ignorados.
- Copiar o descargar una imagen crea una nueva evidencia del estado actual de la página.
- La extensión solicita el permiso de descargas para exportar capturas solicitadas por el usuario.
