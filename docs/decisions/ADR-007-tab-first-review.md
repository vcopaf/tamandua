# ADR-007: Revisión Iniciada Desde La Pestaña

## Contexto

La creación de proyectos mediante nombre y URL antes de revisar una página añade fricción al flujo manual de QA. Las sesiones además necesitaban identificar las páginas que se analizaron.

## Decisión

La extensión permite iniciar una revisión desde la pestaña activa `http` o `https`. Reutiliza un proyecto cuyo `baseUrl` coincide con el origen de la pestaña o crea uno automáticamente usando el dominio. La sesión conserva la URL completa de inicio.

Se incorpora `session_pages` como registro de las páginas analizadas, con URL, título, fecha de primera y última observación y cantidad de análisis.

## Consecuencias

- La URL no es un campo obligatorio de la interfaz para empezar una revisión.
- Los proyectos y sesiones continúan persistiendo localmente desde el inicio, evitando pérdida de hallazgos.
- El historial de páginas permite ampliar posteriormente la revisión continua sin alterar los hallazgos existentes.
