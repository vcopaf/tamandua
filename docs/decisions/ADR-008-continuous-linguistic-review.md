# ADR-008: Revisión Lingüística Continua

## Contexto

La revisión manual de cada pantalla impide detectar problemas de redacción mientras el revisor navega por una aplicación. Las capturas periódicas o grabaciones continuas consumirían recursos y podrían recolectar contenido sensible sin necesidad.

## Decisión

La extensión ofrece un modo persistente de revisión continua. El content script detecta cargas y cambios de URL, incluidos cambios de ruta SPA, y comunica una página estable después de 1.5 segundos. El background solicita bloques visibles de texto, los revisa mediante el servicio local y registra candidatos lingüísticos deduplicados.

El modo no toma capturas, no bloquea navegación y se puede detener desde la barra lateral o al finalizar la sesión.

## Consecuencias

- El análisis sigue funcionando aunque se cierre la barra lateral.
- Solo se revisan ortografía, gramática y redacción en esta fase.
- Los hallazgos requieren revisión humana en la Bandeja antes de confirmarse.
- El procesamiento continúa siendo local mediante Tamanduá y LanguageTool opcional.
