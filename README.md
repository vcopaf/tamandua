# Tamanduá

Herramienta local de apoyo para control de calidad de aplicaciones web.

## Estado

Proyecto en Fase 0: fundamentos del producto. La implementación funcional comenzará por los contratos de dominio.

## Requisitos

- Node.js LTS
- pnpm 9+

## Desarrollo

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Los commits usan Conventional Commits, por ejemplo `feat(core): add domain contracts`. El hook local `commit-msg` rechaza mensajes que no cumplan el formato.

El alcance del MVP y las decisiones técnicas están documentados en `docs/`.
