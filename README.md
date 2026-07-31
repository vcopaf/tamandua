# Tamanduá

Herramienta local de apoyo para control de calidad de aplicaciones web.

## Estado

Versión `0.1.0`, MVP local-first demostrable.

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

## Servicio y CLI

```bash
pnpm --filter @tamandua/service build
node apps/service/dist/index.js
```

El servicio escucha únicamente en `http://127.0.0.1:4317`. La CLI se construye con `pnpm --filter @tamandua/cli build` y permite `project create`, `project list`, `session start`, `session list`, `report generate` y `start`.

La extensión se construye con `pnpm --filter @tamandua/extension build` y se carga desde `extension/.output/chrome-mv3` en Chromium mediante `chrome://extensions`. `tamandua report generate <session-id>` produce `report.json`, `report.md` y `report.html`. Los escenarios YAML se ejecutan con `tamandua run --project <id> --scenario escenario.yml`.

La guía reproducible de instalación y demo está en `docs/installation.md`; la revisión de seguridad está en `docs/security.md`.

La guía completa de uso está en `docs/usage.md` y el historial de cambios en `CHANGELOG.md`.
