# Uso Avanzado

Para instalar Tamanduá y realizar la primera revisión, sigue [INSTALL.md](../INSTALL.md). Esta guía describe las funciones disponibles después de iniciar una revisión.

## Revisión Desde La Pestaña

En la extensión, abre la página que quieres revisar y pulsa **Iniciar revisión de esta página**. Tamanduá crea o reutiliza automáticamente un proyecto para el dominio actual y usa la URL abierta como inicio de la sesión; no es necesario introducir una URL antes de revisar.

Cada vez que analizas una pantalla, la sesión registra su URL, título y cantidad de análisis en el historial de páginas revisadas. La creación manual de proyectos permanece disponible para configurar un nombre, una URL o un contexto antes de comenzar.

## Revisión Continua

Con una revisión activa, pulsa **Iniciar revisión continua** y navega normalmente. Tamanduá espera 1.5 segundos después de una carga o cambio de ruta y revisa texto visible para detectar candidatos de ortografía, gramática y redacción. Los candidatos nuevos se agregan a la Bandeja de revisión; no se toman capturas automáticas ni se interrumpe la navegación.

El modo permanece activo aunque cierres la barra lateral. Pulsa **Detener revisión continua** o finaliza la revisión para desactivarlo. Los resultados repetidos se deduplican por sesión, origen, regla, URL, selector y texto.

## Revisión De Redacción Local

Cada proyecto conserva un contexto lingüístico con idioma, términos permitidos, formas preferidas y notas de revisión. Desde la extensión, configura el contexto en Proyecto y abre Ortografía para revisar el texto visible de la pestaña.

Tamanduá siempre aplica reglas locales. Para activar comprobaciones adicionales de gramática y estilo en español, inicia LanguageTool en la misma máquina y puerto local:

```bash
java -cp languagetool-server.jar org.languagetool.server.HTTPServer --port 8081
```

El servidor se consulta únicamente mediante `127.0.0.1`; el contenido revisado no se envía a servicios externos. Los resultados son candidatos: usa Ver en página para resaltar el texto, Es bug para registrarlo, No es bug para descartarlo de la revisión o Ignorar término para añadirlo al contexto del proyecto.

**No es bug** conserva el descarte en la revisión. **Ignorar término** evita que se reporte de nuevo en el proyecto actual. **Ignorar globalmente** aplica el ignorado a todos los proyectos que utilicen el mismo idioma; úsalo solo para nombres propios, siglas o términos explícitos.

## Bandeja De Revisión

La sección Hallazgos reúne los candidatos de reglas, redacción, IA y creación manual. Filtra por estado, origen, categoría o severidad. Cada tarjeta permite localizar el elemento, confirmar como bug, descartar, marcar como duplicado, editar los datos y capturar evidencia sin salir de la bandeja.

Las acciones Capturar evidencia, Copiar captura y Descargar captura toman una imagen explícita de la pestaña actual y guardan su evidencia localmente. No se producen capturas periódicas ni durante la revisión continua.

Para crear un hallazgo manual, abre Inspección, usa Seleccionar elemento y completa el formulario Hallazgo manual. El selector, texto y URL de la página se asocian automáticamente cuando están disponibles.

## Cierre Y Reportes

La tarjeta de Revisión actual muestra un resumen de confirmados, pendientes y descartados. Al finalizar, Tamanduá advierte si aún existen candidatos pendientes para que puedas revisarlos o cerrar la sesión explícitamente.

Los botones de Reporte descargan JSON, Markdown o HTML. Los detalles del reporte incluyen únicamente hallazgos confirmados; el resumen conserva los conteos de todos los estados para mantener trazabilidad de candidatos, descartes, duplicados y resueltos.

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
