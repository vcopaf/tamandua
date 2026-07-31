# ADR-005: Paquete De Persistencia Separado

## Estado

Aceptada

## Decisión

SQLite y Drizzle vivirán en `packages/persistence`, separado de `packages/core`.

## Motivo

El núcleo conserva reglas y contratos sin depender de infraestructura. Esta separación permite sustituir el almacenamiento o usar una base aislada en pruebas sin contaminar el dominio.
