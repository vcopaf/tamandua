# ADR-004: Conventional Commits

## Estado

Aceptada

## Decisión

Los commits deberán seguir Conventional Commits y serán validados por `commitlint` desde el hook `commit-msg` de Husky.

## Formato

```text
<tipo>(<ámbito>): <descripción>
```

Ejemplos válidos: `feat(core): add finding lifecycle` y `fix(cli): validate project input`.

## Motivo

Una estructura uniforme facilita revisar el historial, automatizar changelogs y comunicar el alcance de cada cambio.
