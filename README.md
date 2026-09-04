# Tamanduá

Tamanduá es una herramienta local para revisar la calidad de aplicaciones web mientras navegas. Detecta posibles errores de ortografía, gramática y redacción, los reúne en una bandeja de revisión y permite confirmar, descartar, documentar y exportar hallazgos.

Todo el procesamiento se ejecuta en tu equipo. Tamanduá no requiere cuentas, tokens ni servicios de pago.

## Qué Hace

- Inicia una revisión directamente desde la pestaña actual; no necesitas crear un proyecto ni escribir una URL antes de empezar.
- Revisa texto visible para detectar ortografía, gramática y oportunidades de redacción.
- Usa reglas locales y, opcionalmente, LanguageTool ejecutado en tu propia máquina.
- Puede revisar mientras navegas mediante el modo de revisión continua.
- Organiza resultados en una bandeja: pendiente, confirmado, no es bug, duplicado o resuelto.
- Permite ignorar términos por proyecto o globalmente por idioma.
- Captura, copia o descarga evidencia visual bajo demanda.
- Descarga reportes JSON, Markdown y HTML con los hallazgos confirmados.

## Inicio Rápido

La instalación, los comandos y la carga de la extensión están explicados paso a paso en [INSTALL.md](INSTALL.md).

Después de instalar:

1. Inicia el servicio local de Tamanduá.
2. Carga la extensión en Firefox o, alternativamente, Chromium.
3. Abre la página que quieres revisar.
4. Abre Tamanduá y pulsa **Iniciar revisión de esta página**.
5. Pulsa **Iniciar revisión continua** o revisa una página manualmente.
6. Decide qué candidatos son bugs y descarga el reporte al finalizar.

## Componentes

| Componente | Necesario | Función |
| --- | --- | --- |
| Node.js y pnpm | Sí | Ejecutar Tamanduá |
| Servicio local | Sí | Guardar proyectos, revisiones, hallazgos y evidencias |
| Extensión | Sí | Revisar las páginas abiertas en el navegador |
| LanguageTool local | No | Añadir gramática y estilo avanzados en español |
| CLI y Playwright | No | Automatización y escenarios de prueba |

## Arquitectura Local

```text
Navegador + extensión
        |
        v
Tamanduá local: http://127.0.0.1:4317
        |
        +-- SQLite y evidencias: ~/.tamandua/
        |
        +-- LanguageTool opcional: http://127.0.0.1:8081
```

El servicio de Tamanduá escucha solo en `127.0.0.1`. LanguageTool es opcional: sin él, las reglas locales siguen funcionando.

## Documentación

- [Instalación y primer uso](INSTALL.md)
- [Uso avanzado](docs/usage.md)
- [Seguridad y privacidad](docs/security.md)
- [Arquitectura](docs/architecture/overview.md)
- [Decisiones técnicas](docs/decisions/)
- [Producto y roadmap](docs/product/)

## Desarrollo

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Los commits usan Conventional Commits. El hook local `commit-msg` valida el formato.
