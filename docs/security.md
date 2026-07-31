# Revisión De Seguridad MVP

- El servicio se enlaza exclusivamente a `127.0.0.1`.
- La extensión solo solicita `sidePanel`, `activeTab` y `tabs`.
- El único host remoto permitido por la extensión es `http://127.0.0.1:4317/*`.
- No se almacenan contraseñas, cookies ni encabezados de autorización.
- Los mensajes técnicos redactan tokens y credenciales antes de conservarse.
- Las capturas se guardan como archivos y SQLite conserva únicamente metadatos y rutas.
- La captura de evidencia requiere una confirmación explícita del ID del hallazgo.

La revisión E2E actual cubre el servicio HTTP, validación de entradas, parser YAML, runner y redacción técnica. La prueba automatizada de la extensión en Chromium queda como deuda para una suite Playwright de navegador dedicada.
