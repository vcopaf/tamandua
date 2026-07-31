# Changelog

## [0.1.0] - 2026-07-31

### Added

- Monorepo TypeScript estricto con pnpm, Biome, Vitest y Conventional Commits.
- Contratos de dominio con Zod y núcleo de negocio independiente de infraestructura.
- Persistencia SQLite local mediante Drizzle y libSQL.
- Servicio HTTP local y CLI para proyectos, sesiones, hallazgos y reportes.
- Extensión Chromium con panel lateral, inspección, selector visual y evidencias.
- Motor de reglas para formularios, contenido y accesibilidad básica.
- Reportes JSON, Markdown y HTML.
- Runner Playwright con escenarios YAML, screenshots y traces en fallos.
- Captura de consola, respuestas HTTP 5xx y redacción de datos sensibles.
- Reglas lingüísticas locales y adaptador opcional para LanguageTool.
- Demo reproducible y pruebas integrales del servicio y runner.

### Limitations

- La captura de elemento utiliza el screenshot visible con selector asociado; el recorte geométrico exacto queda para una iteración posterior.
- La extensión aún no tiene una suite E2E automatizada en Chromium.
- Las ejecuciones Playwright todavía no se persisten en las tablas `executions`.
