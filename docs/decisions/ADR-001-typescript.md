# ADR-001: TypeScript Estricto

## Estado

Aceptada

## Decisión

Usar TypeScript estricto para todos los paquetes del monorepo.

## Motivo

El producto comparte contratos entre CLI, servicio, extensión y automatización. El tipado estricto reduce errores en esos límites y facilita refactorizaciones seguras.
