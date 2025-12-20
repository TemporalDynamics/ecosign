#!/bin/bash

# 🚀 Script de Deploy Automático para EcoSign
# Este script automatiza el proceso completo de deploy a Vercel

echo "=========================================="
echo "🚀 EcoSign - Deploy Automático"
echo "=========================================="
echo ""

# Configuración Supabase (override con variables de entorno si querés)
SUPABASE_PROJECT_REF=${SUPABASE_PROJECT_REF:-"uiyojopjbhooxrmamaiw"}
SUPABASE_AUTOMATE=${SUPABASE_AUTOMATE:-"true"} # exporta a "false" si querés saltar Supabase

# Helpers
ensure_supabase_cli() {
  if command -v supabase >/dev/null 2>&1; then
    return 0
  fi
  echo "⚙️  Instalando Supabase CLI..."
  npm install -g supabase >/dev/null 2>&1
}

run_supabase_migrations() {
  echo "📥 Aplicando migraciones de Supabase..."
  (cd supabase && supabase db push --project-ref "$SUPABASE_PROJECT_REF")
}

deploy_supabase_functions() {
  echo "🚀 Desplegando Supabase Functions..."
  local functions
  # Desplegamos todos los directorios de supabase/functions excepto los que empiezan con "_"
  functions=$(find supabase/functions -maxdepth 1 -mindepth 1 -type d -printf "%f\n" | grep -v '^_')
  for func in $functions; do
    echo "   → $func"
    (cd supabase && supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt)
  done
}

# Verificar que estamos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  ADVERTENCIA: No estás en la rama main"
  echo "   Rama actual: $CURRENT_BRANCH"
  echo ""
  read -p "¿Continuar de todas formas? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 1
  fi
fi

# Verificar si hay cambios sin commitear
if [[ -n $(git status -s) ]]; then
  echo "📝 Hay cambios sin commitear:"
  git status -s
  echo ""
  read -p "¿Quieres hacer commit de estos cambios? (y/n): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Mensaje del commit: " COMMIT_MSG
    git add .
    git commit -m "$COMMIT_MSG"
    git push origin main
    echo "✅ Cambios commiteados y pusheados"
  else
    echo "⚠️  Continuando sin commitear..."
  fi
fi

if [ "$SUPABASE_AUTOMATE" = "true" ]; then
  echo ""
  echo "🔗 Verificando Supabase..."
  ensure_supabase_cli
  if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN no está definido. Omitiendo migraciones y funciones."
  else
    # Aseguramos link (idempotente)
    (cd supabase && supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null)
    run_supabase_migrations
    deploy_supabase_functions
  fi
fi

echo ""
echo "📦 Iniciando deploy a Vercel..."
echo ""

# Deploy a Vercel (guardando output en archivo temporal)
vercel --prod --force > /tmp/vercel-deploy.log 2>&1 &
VERCEL_PID=$!

# Mostrar spinner mientras se hace el deploy
spin='-\|/'
i=0
while kill -0 $VERCEL_PID 2>/dev/null; do
  i=$(( (i+1) %4 ))
  printf "\r${spin:$i:1} Deploying..."
  sleep .1
done

echo ""
echo ""

# Verificar si el deploy fue exitoso (buscar "Production:" con o sin ✅)
if grep -q "Production:" /tmp/vercel-deploy.log; then
  # Extraer la URL del deployment (funciona con ambas versiones de Vercel CLI)
  DEPLOYMENT_URL=$(grep "Production:" /tmp/vercel-deploy.log | grep -oE 'https://[^ ]+' | tail -1)
  
  echo "✅ Deploy exitoso!"
  echo "   URL del deployment: $DEPLOYMENT_URL"
  echo ""
  echo "🔗 Asignando dominios personalizados..."
  echo ""
  
  # Asignar alias a www.ecosign.app
  echo "   → www.ecosign.app"
  vercel alias set $DEPLOYMENT_URL www.ecosign.app > /dev/null 2>&1
  
  # Asignar alias a ecosign.app
  echo "   → ecosign.app"
  vercel alias set $DEPLOYMENT_URL ecosign.app > /dev/null 2>&1
  
  echo ""
  echo "=========================================="
  echo "✅ ¡DEPLOY COMPLETADO!"
  echo "=========================================="
  echo ""
  echo "🌐 Tu sitio está disponible en:"
  echo "   • https://www.ecosign.app"
  echo "   • https://ecosign.app"
  echo ""
  echo "🔍 Verifica en:"
  echo "   https://vercel.com/temporal-dynamics-projects/ecosign"
  echo ""
  echo "⏱️  Espera 1-2 minutos para que el CDN se actualice"
  echo "🗑️  Limpia la caché del navegador (Ctrl+Shift+R)"
  echo ""
else
  echo ""
  echo "=========================================="
  echo "❌ ERROR EN EL DEPLOY"
  echo "=========================================="
  echo ""
  echo "📋 Log del error:"
  cat /tmp/vercel-deploy.log
  echo ""
  exit 1
fi

# Limpiar archivo temporal
rm /tmp/vercel-deploy.log
