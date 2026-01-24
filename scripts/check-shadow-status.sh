#!/bin/bash
# Script de verificación rápida del estado del shadow mode
# Uso: ./scripts/check-shadow-status.sh [decision_code]

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo "🔍 Shadow Mode Status Check"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -z "$1" ]; then
  echo "📊 Resumen general de todas las decisiones:"
  echo ""
  psql "$DB_URL" -c "SELECT * FROM shadow_decision_summary ORDER BY decision_code;"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🔴 Divergencias totales:"
  echo ""
  psql "$DB_URL" -c "SELECT decision_code, COUNT(*) as total_divergences FROM shadow_decision_divergences GROUP BY decision_code ORDER BY decision_code;"
else
  echo "📊 Resumen de $1:"
  echo ""
  psql "$DB_URL" -c "SELECT * FROM shadow_decision_summary WHERE decision_code = '$1';"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📋 Últimos 10 runs de $1:"
  echo ""
  psql "$DB_URL" -c "SELECT created_at, legacy_decision, canonical_decision, has_divergence FROM shadow_decision_last_runs WHERE decision_code = '$1' ORDER BY created_at DESC LIMIT 10;"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🔴 Divergencias de $1:"
  echo ""
  psql "$DB_URL" -c "SELECT * FROM shadow_decision_divergences WHERE decision_code = '$1' ORDER BY created_at DESC LIMIT 10;"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Check completado"
