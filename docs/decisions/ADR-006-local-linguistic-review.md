# ADR-006: Revisión Lingüística Local

## Contexto

Tamanduá necesita detectar ortografía, gramática y estilo en español sin depender de servicios pagos ni transferir contenido de páginas a terceros.

## Decisión

La extensión recopila bloques visibles de texto y los envía al servicio local de Tamanduá. El servicio aplica reglas locales configuradas con el contexto del proyecto y consulta opcionalmente una instancia local de LanguageTool en `127.0.0.1:8081`.

Cada proyecto conserva un contexto independiente con idioma primario, idiomas habilitados, términos ignorados, términos preferidos, selectores excluidos y notas del revisor. Los resultados lingüísticos son candidatos y requieren decisión humana.

## Consecuencias

- No se requieren credenciales, suscripciones ni llamadas a servicios externos.
- LanguageTool debe instalarse e iniciarse localmente para habilitar su análisis avanzado.
- Si LanguageTool no está disponible, las reglas locales siguen produciendo resultados.
- El contexto lingüístico se persiste separado de los datos básicos del proyecto para permitir su evolución sin alterar proyectos existentes.
