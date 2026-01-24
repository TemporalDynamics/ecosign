#!/bin/bash
# Audita Edge Functions para detectar pattern CORS incorrecto
# Fecha: 2026-01-24

echo "════════════════════════════════════════════════════════════"
echo "AUDITORÍA DE CORS EN EDGE FUNCTIONS"
echo "════════════════════════════════════════════════════════════"
echo ""

FUNCTIONS_DIR="supabase/functions"

# Verificar que existe el directorio
if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "❌ Error: No se encontró $FUNCTIONS_DIR"
  exit 1
fi

echo "📊 Buscando funciones con pattern CORS..."
echo ""

# Encontrar todas las funciones
TOTAL_FUNCTIONS=$(find "$FUNCTIONS_DIR" -maxdepth 1 -type d ! -name "_shared" ! -name "functions" | wc -l)
echo "Total de funciones encontradas: $((TOTAL_FUNCTIONS - 1))"
echo ""

echo "──────────────────────────────────────────────────────────"
echo "✅ FUNCIONES CON PATTERN A (Correcto - getCorsHeaders)"
echo "──────────────────────────────────────────────────────────"

PATTERN_A_COUNT=0
for func in "$FUNCTIONS_DIR"/*/index.ts; do
  func_name=$(basename $(dirname "$func"))
  if [ "$func_name" = "_shared" ]; then
    continue
  fi

  if grep -q "getCorsHeaders" "$func" 2>/dev/null; then
    echo "✅ $func_name"
    PATTERN_A_COUNT=$((PATTERN_A_COUNT + 1))
  fi
done

echo ""
echo "Total: $PATTERN_A_COUNT funciones"
echo ""

echo "──────────────────────────────────────────────────────────"
echo "❌ FUNCIONES CON PATTERN B (Incorrecto - corsHeaders hardcoded)"
echo "──────────────────────────────────────────────────────────"

PATTERN_B_COUNT=0
PATTERN_B_FUNCTIONS=()
for func in "$FUNCTIONS_DIR"/*/index.ts; do
  func_name=$(basename $(dirname "$func"))
  if [ "$func_name" = "_shared" ]; then
    continue
  fi

  if ! grep -q "getCorsHeaders" "$func" 2>/dev/null; then
    if grep -q "corsHeaders" "$func" 2>/dev/null || grep -q "Access-Control-Allow-Origin" "$func" 2>/dev/null; then
      echo "❌ $func_name"
      PATTERN_B_FUNCTIONS+=("$func_name")
      PATTERN_B_COUNT=$((PATTERN_B_COUNT + 1))
    fi
  fi
done

echo ""
echo "Total: $PATTERN_B_COUNT funciones REQUIEREN MIGRACIÓN"
echo ""

echo "──────────────────────────────────────────────────────────"
echo "⚠️  FUNCIONES SIN CORS (potencialmente problemáticas)"
echo "──────────────────────────────────────────────────────────"

NO_CORS_COUNT=0
for func in "$FUNCTIONS_DIR"/*/index.ts; do
  func_name=$(basename $(dirname "$func"))
  if [ "$func_name" = "_shared" ]; then
    continue
  fi

  if ! grep -q "getCorsHeaders" "$func" 2>/dev/null && \
     ! grep -q "corsHeaders" "$func" 2>/dev/null && \
     ! grep -q "Access-Control-Allow-Origin" "$func" 2>/dev/null; then
    echo "⚠️  $func_name"
    NO_CORS_COUNT=$((NO_CORS_COUNT + 1))
  fi
done

echo ""
echo "Total: $NO_CORS_COUNT funciones"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "RESUMEN"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ Pattern A (correcto):       $PATTERN_A_COUNT funciones"
echo "❌ Pattern B (incorrecto):     $PATTERN_B_COUNT funciones"
echo "⚠️  Sin CORS explícito:        $NO_CORS_COUNT funciones"
echo ""
echo "Cobertura correcta: $(awk "BEGIN {printf \"%.1f\", ($PATTERN_A_COUNT / ($TOTAL_FUNCTIONS - 1)) * 100}")%"
echo ""

if [ $PATTERN_B_COUNT -gt 0 ]; then
  echo "════════════════════════════════════════════════════════════"
  echo "ACCIÓN REQUERIDA"
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "Las siguientes funciones DEBEN migrarse a Pattern A:"
  echo ""
  for func in "${PATTERN_B_FUNCTIONS[@]}"; do
    echo "  • $func"
  done
  echo ""
  echo "Comando para migrar:"
  echo "  # TODO: crear script migrate-cors-pattern.sh"
  echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo "VARIABLES DE ENTORNO REQUERIDAS EN PRODUCCIÓN"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "En Supabase Dashboard → Settings → Functions → Environment Variables:"
echo ""
echo "  ALLOWED_ORIGINS=https://ecosign.app,https://www.ecosign.app"
echo ""
echo "O alternativamente:"
echo ""
echo "  SITE_URL=https://ecosign.app"
echo ""
echo "════════════════════════════════════════════════════════════"
