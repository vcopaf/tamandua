# Arquitectura

Tamanduá será un monorepo TypeScript con un núcleo de dominio compartido. Las aplicaciones ejecutables (CLI y servicio local), la extensión Chromium y los adaptadores de infraestructura dependerán del núcleo, no al revés.

La persistencia será local con SQLite. El servicio HTTP escuchará únicamente en `127.0.0.1`. Los archivos binarios de evidencia vivirán en el sistema de archivos y SQLite conservará sus metadatos y rutas.

La validación de contratos en los límites externos se realizará con Zod. Las reglas serán módulos desacoplados y producirán hallazgos candidatos que requerirán revisión humana.
