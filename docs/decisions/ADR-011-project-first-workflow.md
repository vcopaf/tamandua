# ADR-011: Flujo De Proyecto Abierto

## Contexto

El inicio automático de un proyecto desde la pestaña actual reducía la fricción, pero ocultaba el contexto de trabajo y mezclaba la selección de proyecto con el inicio de una revisión. La interfaz necesitaba distinguir claramente entre elegir un proyecto y ejecutar una revisión.

## Decisión

Tamanduá inicia en un selector de proyectos. El usuario abre un proyecto existente o crea uno en una vista dedicada. La creación requiere nombre, pero no URL. Solo un proyecto abierto permite iniciar una revisión desde la pestaña actual.

Salir del proyecto devuelve al selector. Si existe una revisión activa, Tamanduá requiere confirmación para finalizarla antes de salir.

## Consecuencias

- El proyecto es un contexto explícito antes de revisar páginas.
- La URL deja de ser requisito para crear un proyecto; la sesión conserva la URL real de la pestaña revisada.
- La extensión prioriza Ortografía y redacción dentro del proyecto abierto.
