# Tamanduá

## Reglas de trabajo

- Implementar una fase del MVP a la vez.
- Leer este archivo antes de modificar código.
- Mantener TypeScript estricto y validar entradas externas con Zod cuando se incorporen.
- Mantener la lógica de negocio separada de infraestructura y UI.
- Escribir pruebas junto con cada funcionalidad.
- No almacenar secretos, contraseñas ni tokens en evidencias o logs.
- Actualizar el README y crear un ADR cuando cambie la arquitectura.
- Antes de cerrar una fase ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`.

## Estructura

- `packages/core`: contratos y lógica de dominio compartibles.
- `apps/`: aplicaciones ejecutables futuras, como servicio y CLI.
- `extension/`: extensión Chromium futura.
- `docs/`: producto, arquitectura y decisiones.

No agregar funcionalidades de fases posteriores sin una decisión explícita.
