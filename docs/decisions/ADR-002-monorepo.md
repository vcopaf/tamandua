# ADR-002: Monorepo Con pnpm

## Estado

Aceptada

## Decisión

Gestionar el código con pnpm workspaces y paquetes independientes bajo `packages/` y `apps/`.

## Motivo

El núcleo de dominio debe compartirse entre varias aplicaciones sin duplicar contratos, manteniendo dependencias y builds aislados.
