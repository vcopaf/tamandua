# Modelo De Datos Inicial

Las entidades principales son `Project`, `Session`, `Finding`, `Evidence`, `Scenario`, `Execution` y `RuleResult`.

Relaciones previstas:

- Un proyecto tiene muchas sesiones y escenarios.
- Una sesión pertenece a un proyecto y tiene muchos hallazgos y ejecuciones.
- Un hallazgo puede tener muchas evidencias.
- Una ejecución pertenece a una sesión y registra pasos y resultados.
- Un resultado de regla puede originar un hallazgo candidato.

Los contratos TypeScript y Zod viven en `packages/core/src`. Los esquemas validan datos en los límites externos y sus tipos inferidos son la fuente compartida para las aplicaciones. El dominio continúa sin acoplamiento a SQLite.
