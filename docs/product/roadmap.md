# Roadmap Del MVP

Este documento contiene el plan de desarrollo aprobado de Tamanduá. Se implementa una fase por vez y no se incorporan funcionalidades de fases posteriores sin una decisión explícita.

## Fases

0. Fundamentos: monorepo, TypeScript, pnpm, Biome, Vitest y documentación.
1. Contratos de dominio: Project, Session, Finding, Evidence, Scenario, Execution y RuleResult con Zod.
2. Núcleo de negocio: ciclos de vida, transiciones, evidencias y resúmenes.
3. Persistencia local: SQLite, Drizzle, migraciones y repositorios.
4. CLI y servicio local: proyectos, sesiones, reportes, HTTP local y errores estructurados.
5. Extensión base: WXT, panel lateral, background worker y conexión.
6. Inspección manual: snapshot de pantalla, controles y selector visual.
7. Motor de reglas: reglas de formularios, contenido y accesibilidad.
8. Evidencias: capturas, anotaciones, metadatos y redacción básica.
9. Gestión de hallazgos: edición, filtros, confirmación, descarte y duplicados.
10. Reportes: HTML, Markdown y JSON regenerables.
11. Playwright mínimo: escenarios YAML, acciones, checks, screenshots y traces.
12. Consola y red: errores de consola, HTTP 500 y candidatos técnicos.
13. Ortografía: reglas locales, glosario e integración opcional con LanguageTool.
14. Pruebas integrales y endurecimiento: E2E, permisos, seguridad y demo.
15. Entrega 0.1.0: empaquetado, documentación, ejemplos y changelog.

## Hitos

- Hito 1, núcleo ejecutable: fases 0 a 4.
- Hito 2, revisión manual presentable: fases 5 a 10.
- Hito 3, automatización inicial: fases 11 y 12.
- Hito 4, calidad del contenido: fases 13 y 14.
- Hito 5, MVP 0.1.0: fase 15.

## Criterios globales

Cada fase debe mantener TypeScript estricto, pruebas junto con la funcionalidad, separación entre dominio e infraestructura, validación Zod en límites externos y documentación actualizada. Antes de cerrar una fase deben pasar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`.
