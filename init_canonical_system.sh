#!/bin/bash
# Script de inicialización del sistema canónico
# 
# Este script asegura que todos los componentes del sistema canónico
# estén correctamente configurados y operativos.

set -e  # Salir si hay error

echo "🚀 Inicializando sistema canónico Ecosign..."

# Verificar variables de entorno
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidas"
    exit 1
fi

echo "✅ Variables de entorno verificadas"

# 1. Asegurar que las funciones estén desplegadas
echo "1️⃣  Verificando funciones desplegadas..."
supabase functions list | grep -E "(fase1-executor|orchestrator|new-document-canonical-trigger)" > /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Algunas funciones no están desplegadas, desplegando..."
    supabase functions deploy fase1-executor
    supabase functions deploy orchestrator
    supabase functions deploy new-document-canonical-trigger
else
    echo "✅ Funciones ya desplegadas"
fi

# 2. Asegurar que las migraciones estén aplicadas
echo "2️⃣  Verificando migraciones..."
supabase migration list | grep -E "(20260127000000|20260127010000)" > /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Algunas migraciones no están aplicadas, aplicando..."
    supabase migration up
else
    echo "✅ Migraciones ya aplicadas"
fi

# 3. Verificar que los feature flags estén configurados
echo "3️⃣  Verificando feature flags..."
if [ -n "$ENABLE_D1_CANONICAL" ]; then
    echo "✅ Feature flag D1_CANONICAL configurado: $ENABLE_D1_CANONICAL"
else
    echo "ℹ️  Feature flag D1_CANONICAL no configurado (normal en staging)"
fi

if [ -n "$ENABLE_D4_CANONICAL" ]; then
    echo "✅ Feature flag D4_CANONICAL configurado: $ENABLE_D4_CANONICAL"
else
    echo "ℹ️  Feature flag D4_CANONICAL no configurado (normal en staging)"
fi

if [ -n "$ENABLE_D3_CANONICAL" ]; then
    echo "✅ Feature flag D3_CANONICAL configurado: $ENABLE_D3_CANONICAL"
else
    echo "ℹ️  Feature flag D3_CANONICAL no configurado (normal en staging)"
fi

# 4. Ejecutar verificación del sistema
echo "4️⃣  Ejecutando verificación del sistema..."
deno run --allow-env --allow-net scripts/verify_canonical_system.ts
if [ $? -ne 0 ]; then
    echo "❌ Error en verificación del sistema"
    exit 1
fi

# 5. Iniciar monitoreo (opcional, en background)
echo "5️⃣  Iniciando monitoreo del sistema..."
deno run --allow-env --allow-net scripts/monitor_canonical_system.ts &
MONITOR_PID=$!
echo "✅ Monitor iniciado con PID: $MONITOR_PID"

echo ""
echo "🎉 ¡Sistema canónico inicializado exitosamente!"
echo ""
echo "Arquitectura activa:"
echo "- Verdad: document_entities.events[]"
echo "- Autoridad: packages/authority" 
echo "- Executor: fase1-executor (lee verdad → usa autoridad → escribe cola)"
echo "- Orchestrator: orchestrator (lee cola → ejecuta → escribe eventos)"
echo ""
echo "Sistema listo para operar según modelo canónico."
echo ""
echo "PID del monitor: $MONITOR_PID (ejecute 'kill $MONITOR_PID' para detener)"