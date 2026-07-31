# Instalación Y Demo

## Requisitos

- mise
- Node `24.16.0`
- pnpm `9.15.0`
- Chromium para ejecutar la extensión

## Instalación

```bash
mise install
pnpm install
pnpm build
```

## Servicio

```bash
node apps/service/dist/index.js
```

El servicio escucha en `127.0.0.1:4317` y guarda datos en `~/.tamandua/`.

## Extensión

1. Abrir `chrome://extensions`.
2. Activar Developer mode.
3. Seleccionar Load unpacked.
4. Elegir `extension/.output/chrome-mv3`.

## Demo Playwright

Servir la demo desde la raíz:

```bash
python3 -m http.server 8080 --directory demo
```

Ejecutar el escenario:

```bash
node apps/cli/dist/index.js run --project <project-id> --scenario demo/registro-valido.yml
```
