# ADR-003: Diseño Local-First

## Estado

Aceptada

## Decisión

El servicio, la base SQLite y las evidencias se ejecutarán y almacenarán localmente por defecto.

## Motivo

El MVP está orientado a sesiones de QA que pueden contener datos sensibles. No se requiere autenticación ni sincronización en la nube, y localhost limita la superficie de exposición inicial.
