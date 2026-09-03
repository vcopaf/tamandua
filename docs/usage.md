# Guía De Uso

## Flujo básico

1. Instalar dependencias con `mise install && pnpm install`.
2. Iniciar el servicio con `node apps/service/dist/index.js`.
3. Crear un proyecto:

```bash
node apps/cli/dist/index.js project create demo --url http://127.0.0.1:8080
```

4. Listar proyectos y copiar el identificador:

```bash
node apps/cli/dist/index.js project list
```

5. Iniciar una sesión:

```bash
node apps/cli/dist/index.js session start --project <project-id> --mode manual
```

6. Cargar `extension/.output/chrome-mv3` en Chromium.
7. Analizar la pantalla, registrar candidatos y confirmar o descartar hallazgos.
8. Generar reportes:

```bash
node apps/cli/dist/index.js report generate <session-id>
```

## Revisión De Redacción Local

Cada proyecto conserva un contexto lingüístico con idioma, términos permitidos, formas preferidas y notas de revisión. Desde la extensión, configura el contexto en Proyecto y abre Ortografía para revisar el texto visible de la pestaña.

Tamanduá siempre aplica reglas locales. Para activar comprobaciones adicionales de gramática y estilo en español, inicia LanguageTool en la misma máquina y puerto local:

```bash
java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
```

El servidor se consulta únicamente mediante `127.0.0.1`; el contenido revisado no se envía a servicios externos. Los resultados son candidatos: usa Ver en página para resaltar el texto, Es bug para registrarlo, No es bug para descartarlo de la revisión o Ignorar término para añadirlo al contexto del proyecto.

## Automatización

Servir la demo y ejecutar el escenario incluido:

```bash
python3 -m http.server 8080 --directory demo
node apps/cli/dist/index.js run --project <project-id> --scenario demo/registro-valido.yml
```

Los fallos generan screenshot y trace bajo `~/.tamandua/runs/`.

## Logs

El servicio escribe una línea JSON por cada solicitud, por ejemplo:

```json
{"event":"http_request","requestId":"...","method":"POST","path":"/sessions","status":201,"durationMs":4}
```

Los logs no incluyen cuerpos de solicitudes, contraseñas, cookies ni encabezados de autorización.

## Empaquetado

```bash
pnpm package:release
```

El comando crea `release/tamandua-0.1.0-extension.zip`.
