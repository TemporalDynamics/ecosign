# Nota sobre Eliminación de Configuración Inválida

## Fecha
26 de enero de 2026

## Motivo
El archivo `20260126160000_feature_flags_default_config.sql` fue eliminado porque contenía una implementación inválida de feature flags:

```sql
SELECT set_config('app.flags.D1_RUN_TSA_ENABLED', 'false', false);
```

## Problema
La función `set_config()` en PostgreSQL solo afecta la **sesión actual**. Cuando la migración termina, los flags desaparecen. Los triggers no encontrarían los flags y siempre retornarían al modo legacy.

## Solución
La implementación correcta utiliza una tabla persistente `feature_flags` que se sincroniza desde Deno (TypeScript) hacia PostgreSQL, manteniendo la consistencia entre ambos sistemas.

## Referencia
Ver el roadmap de corrección para la implementación correcta de feature flags.