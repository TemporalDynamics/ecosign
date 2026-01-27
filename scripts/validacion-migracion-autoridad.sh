# Script de Validación de Migración de Autoridad

## Descripción
Este script automatiza la validación de la migración controlada de autoridad desde el sistema legacy al executor canónico.

## Requisitos Previos
- Ambiente de staging con los cambios desplegados
- Acceso a logs del executor
- Herramienta de monitoreo de base de datos
- Cliente HTTP para pruebas de API

## Variables de Entorno
```bash
# URLs
STAGING_BASE_URL=https://tu-staging-url.supabase.co
FUNCTIONS_URL=$STAGING_BASE_URL/functions/v1

# Credenciales
SERVICE_ROLE_KEY="tu-service-role-key"

# Feature flags (inicialmente todos en false)
ENABLE_D1_CANONICAL=false
ENABLE_D3_CANONICAL=false
ENABLE_D4_CANONICAL=false
ENABLE_D5_CANONICAL=false
SIMULATE=false
```

## Paso 1: Estado Inicial (Legacy Activo)
```bash
# 1.1. Verificar configuración inicial
echo "Verificando configuración inicial..."
curl -X POST $FUNCTIONS_URL/health-check \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"check": "feature_flags"}'

# 1.2. Ejecutar flujo de prueba básico
echo "Ejecutando flujo de prueba en modo legacy..."
# Aquí iría una prueba de protección de documento
# y se verificaría que los triggers legacy responden
```

## Paso 2: Activar D1 (TSA) - Modo Canónico
```bash
# 2.1. Activar flag de TSA
echo "Activando ENABLE_D1_CANONICAL=true..."
# Esto dependerá de cómo se configuren los flags en tu sistema
# Puede ser a través de variables de entorno o settings de Supabase

# 2.2. Ejecutar flujo de protección de documento
echo "Ejecutando protección de documento con D1 canónico..."
# Llamada a la API de protección
# Verificar que el executor procesa el evento
# Verificar que no hay llamadas directas a TSA desde triggers
```

## Paso 3: Validar Comportamiento
```bash
# 3.1. Verificar logs del executor
echo "Verificando logs del executor..."
# Buscar logs con "PASO_2_CANONICAL_ACTIVE"
# Verificar que no hay discrepancias en D1

# 3.2. Verificar que no hay duplicación
echo "Verificando ausencia de duplicación..."
# Verificar que no hay múltiples TSAs para el mismo documento
```

## Paso 4: Prueba de Rollback
```bash
# 4.1. Desactivar flag de TSA
echo "Desactivando ENABLE_D1_CANONICAL=false..."

# 4.2. Verificar retorno a modo legacy
echo "Verificando retorno a modo legacy..."
# Ejecutar flujo de prueba y verificar comportamiento legacy
```

## Paso 5: Validación Completa
```bash
# 5.1. Activar múltiples flags secuencialmente
# - Activar D1, probar, verificar
# - Activar D3, probar, verificar  
# - Activar D4, probar, verificar
# - Activar D5, probar, verificar

# 5.2. Verificar combinaciones
# Probar combinaciones de flags activos simultáneamente
```

## Salida Esperada
- [ ] No hay errores en la ejecución
- [ ] El executor procesa correctamente los eventos
- [ ] No hay duplicación de side-effects
- [ ] El sistema responde como se espera según los flags activos
- [ ] El rollback funciona correctamente
- [ ] Los logs son claros y consistentes

## Resultado
Si todas las pruebas pasan, el sistema está listo para el despliegue en producción con el protocolo de migración controlada.