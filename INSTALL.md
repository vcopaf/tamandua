# Instalar Tamanduá

Esta guía instala Tamanduá en Linux y deja lista la extensión para revisar una aplicación web en Firefox. Chromium es una alternativa compatible. Sigue los pasos en orden.

## 1. Requisitos

Necesitas:

- Firefox. Chromium, Chrome, Brave y Edge son alternativas compatibles.
- `git` para obtener el código, si aún no tienes el repositorio.
- `mise` para instalar las versiones correctas de Node.js y pnpm.

LanguageTool y Java son opcionales. Tamanduá funciona sin ellos, pero LanguageTool mejora la detección de gramática y estilo.

### Instalar mise

Si no tienes `mise`, instálalo siguiendo la guía oficial: <https://mise.jdx.dev/getting-started.html>.

Reabre la terminal después de instalarlo y verifica:

```bash
mise --version
```

## 2. Instalar Dependencias

Abre una terminal en la raíz del repositorio de Tamanduá y ejecuta:

```bash
mise install
pnpm install
pnpm build
```

`mise install` descarga Node `24.16.0` y pnpm `9.15.0`, definidos en `mise.toml`.

Verifica que la compilación terminó correctamente:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## 3. Iniciar El Servicio Local

Abre una terminal nueva en la raíz del repositorio y déjala abierta:

```bash
node apps/service/dist/index.js
```

El servicio debería quedar disponible en:

```text
http://127.0.0.1:4317
```

En otra terminal, verifica que responde:

```bash
curl http://127.0.0.1:4317/health
```

La respuesta esperada es:

```json
{"status":"ok","service":"tamandua"}
```

Los datos locales, la base SQLite y las evidencias se guardan bajo `~/.tamandua/`.

## 4. Cargar La Extensión En Firefox

Construye la variante de Firefox:

```text
pnpm --filter @tamandua/extension build:firefox
```

La salida se genera en:

```text
extension/.output/firefox-mv2
```

Para cargarla:

1. Abre `about:debugging#/runtime/this-firefox`.
2. Pulsa **Load Temporary Add-on**.
3. Selecciona `extension/.output/firefox-mv2/manifest.json`.
4. Abre una página web `http` o `https`.
5. Pulsa el icono de Tamanduá para abrir el panel lateral.

Firefox elimina extensiones temporales al reiniciarse. Repite este paso después de reiniciar el navegador.

## 5. Hacer La Primera Revisión

Con el servicio iniciado y la extensión cargada:

1. Abre la aplicación o página que quieres revisar.
2. Abre Tamanduá desde el icono de la extensión.
3. En **Proyectos**, selecciona un proyecto y pulsa **Abrir proyecto**, o pulsa **Crear proyecto**.
4. Al crear un proyecto solo necesitas un nombre; la URL se toma de la pestaña al iniciar una revisión.
5. Pulsa **Iniciar revisión de esta página**.
6. Elige una opción:
   - **Iniciar revisión continua** para analizar texto mientras navegas.
   - **Ortografía** y luego **Revisar página** para analizar solo la pantalla actual.
   - **Inspección** y luego **Analizar pantalla** para ejecutar reglas de QA adicionales.
7. Abre **Hallazgos** para confirmar, descartar o marcar duplicados.
8. Captura evidencia solo si la necesitas.
9. Descarga el reporte y pulsa **Finalizar revisión**.

Para volver al selector de proyectos, pulsa **Salir del proyecto**. Si hay una revisión activa, Tamanduá pedirá confirmación para finalizarla antes de salir.

## 6. Activar LanguageTool Local Opcional

LanguageTool añade corrección gramatical y de estilo. Se ejecuta en tu propio equipo y Tamanduá lo consulta solo mediante `127.0.0.1`.

### Instalar Java

LanguageTool requiere Java. Verifica si ya lo tienes:

```bash
java --version
```

Instala una versión LTS de Java, como Java 17 o posterior, si el comando no existe.

### Descargar e iniciar LanguageTool

1. Descarga exactamente [LanguageTool-stable.zip](https://languagetool.org/download/LanguageTool-stable.zip). Es el paquete completo que incluye el servidor.
2. No descargues `LanguageTool-stable.oxt`: es una extensión de LibreOffice y no sirve para Tamanduá.
3. No necesitas descargar carpetas como `archive/`, `frequency-data/` o `language-training-data/`.
4. Descomprime el archivo y entra a la carpeta resultante:

```bash
unzip LanguageTool-stable.zip
cd LanguageTool-*
```

5. Inicia el servidor en otra terminal:

```bash
java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
```

Comprueba que responde:

```bash
curl http://127.0.0.1:8081/v2/languages
```

No necesitas configurar una API key ni crear una cuenta. Si LanguageTool no está iniciado, Tamanduá conserva las reglas locales de redacción.

## 7. Usar Chromium Opcionalmente

La compilación general crea la variante Chromium en:

```bash
pnpm build
```

La extensión queda disponible en:

```text
extension/.output/chrome-mv3
```

Para cargarla:

1. Abre `chrome://extensions`.
2. Activa **Developer mode**.
3. Pulsa **Load unpacked**.
4. Selecciona la carpeta `extension/.output/chrome-mv3`.


## 8. Reconstruir Después De Cambios

Cuando cambies código de Tamanduá:

```bash
pnpm build
```

Después vuelve a `about:debugging` en Firefox o a `chrome://extensions` en Chromium y recarga la extensión. Si cambiaste el servicio, deténlo con `Ctrl+C` e inicialo de nuevo:

```bash
node apps/service/dist/index.js
```

## Problemas Comunes

| Problema | Solución |
| --- | --- |
| El panel indica “Servicio desconectado” | Confirma que `node apps/service/dist/index.js` sigue ejecutándose y que `curl http://127.0.0.1:4317/health` responde correctamente. |
| No se puede analizar una página | Recarga la página y vuelve a intentarlo. Tamanduá solo analiza páginas `http` y `https`. |
| No aparecen sugerencias gramaticales | Inicia LanguageTool en el puerto `8081`. Las reglas locales siguen disponibles sin él. |
| La extensión no refleja cambios | Ejecuta `pnpm build` y pulsa recargar en la página de extensiones del navegador. |
| El puerto ya está ocupado | Detén el proceso que usa `4317` o `8081`, o cambia la configuración antes de iniciar el servicio correspondiente. |

## Automatización Opcional

La CLI y Playwright son funciones avanzadas. Consulta [docs/usage.md](docs/usage.md) cuando ya tengas el flujo de extensión funcionando.
