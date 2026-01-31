# Configuración de Variables de Entorno TSA

## Variables Disponibles

El sistema soporta las siguientes variables de entorno para configurar el servicio de timestamping:

### TSA_TIMEOUT_MS
- **Descripción**: Timeout en milisegundos para requests a TSA
- **Valor por defecto**: 15000 (15 segundos)
- **Recomendado**:
  - `15000` para TSAs rápidos
  - `30000` si usas TSAs lentos o con latencia alta
- **Ubicación**: `supabase/functions/legal-timestamp/index.ts:177-182`

### TSA_URLS
- **Descripción**: Lista de URLs de TSA separadas por comas
- **Valor por defecto**: `https://freetsa.org/tsr`
- **Formato**: `url1,url2,url3` (sin espacios)
- **Comportamiento**: El sistema intenta las URLs en orden hasta que una responda exitosamente
- **Ubicación**: `supabase/functions/legal-timestamp/index.ts:184-192`

## Cómo Configurar

### Opción 1: Supabase CLI (Producción/Remote)

Para configurar en el entorno de producción:

```bash
# Timeout de 15 segundos
supabase secrets set TSA_TIMEOUT_MS=15000

# URLs de TSA (ajusta según tus servidores)
supabase secrets set TSA_URLS="https://freetsa.org/tsr"

# Si tienes múltiples TSAs (el primero es el prioritario):
supabase secrets set TSA_URLS="https://tsa-rapido-1.example.com/tsr,https://tsa-rapido-2.example.com/tsr,https://freetsa.org/tsr"
```

**Verificar secretos configurados:**
```bash
supabase secrets list
```

**Nota**: Los cambios en secretos requieren re-deploy de las edge functions.

### Opción 2: Archivo .env.local (Desarrollo Local)

Para desarrollo local con `supabase functions serve`:

1. **Crear archivo de entorno:**
```bash
# Crear archivo si no existe
touch supabase/.env.local
```

2. **Agregar variables:**
```bash
cat >> supabase/.env.local << 'EOF'

# TSA Configuration
TSA_TIMEOUT_MS=15000
TSA_URLS=https://freetsa.org/tsr
EOF
```

3. **Usar en desarrollo:**
```bash
# Servir funciones con env vars
supabase functions serve --env-file supabase/.env.local

# O probar función específica
supabase functions serve legal-timestamp --env-file supabase/.env.local
```

### Opción 3: Dashboard de Supabase

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Navega a **Settings** → **Edge Functions**
3. En la sección **Secrets**, agrega:
   - Key: `TSA_TIMEOUT_MS`, Value: `15000`
   - Key: `TSA_URLS`, Value: `https://freetsa.org/tsr`
4. Guarda los cambios

## Ejemplos de Configuración

### Configuración Básica (Solo FreeTSA)
```bash
# Producción
supabase secrets set TSA_TIMEOUT_MS=15000
supabase secrets set TSA_URLS="https://freetsa.org/tsr"

# Desarrollo (.env.local)
TSA_TIMEOUT_MS=15000
TSA_URLS=https://freetsa.org/tsr
```

### Configuración con Fallback (Múltiples TSAs)
```bash
# Producción - Intenta TSAs rápidos primero, FreeTSA como fallback
supabase secrets set TSA_TIMEOUT_MS=15000
supabase secrets set TSA_URLS="https://timestamp.sectigo.com,https://freetsa.org/tsr,http://timestamp.digicert.com"

# Desarrollo (.env.local)
TSA_TIMEOUT_MS=15000
TSA_URLS=https://timestamp.sectigo.com,https://freetsa.org/tsr,http://timestamp.digicert.com
```

### Configuración para TSAs Lentos
```bash
# Producción - Timeout más largo para TSAs con alta latencia
supabase secrets set TSA_TIMEOUT_MS=30000
supabase secrets set TSA_URLS="https://freetsa.org/tsr"

# Desarrollo (.env.local)
TSA_TIMEOUT_MS=30000
TSA_URLS=https://freetsa.org/tsr
```

## Servidores TSA Públicos Comunes

Aquí hay algunas opciones de TSA públicos que puedes usar:

```bash
# FreeTSA (gratuito, puede ser lento)
https://freetsa.org/tsr

# Sectigo (antes Comodo)
https://timestamp.sectigo.com

# DigiCert
http://timestamp.digicert.com

# GlobalSign
http://timestamp.globalsign.com/tsa/r6advanced1

# Nota: Verifica la disponibilidad y términos de uso de cada TSA
```

## Verificar Configuración

### Test desde el código
El código ya incluye logging del timeout y URLs usadas. Revisa los logs:

```bash
# Ver logs de la función
supabase functions logs legal-timestamp

# O en tiempo real
supabase functions logs legal-timestamp --stream
```

### Test manual con curl
```bash
# Test básico (el hash debe ser SHA-256 hex válido)
curl -X POST https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/legal-timestamp \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "hash_hex": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'

# El response incluye: elapsed_ms, timeout_ms, tsa_url usado
```

### Verificar en código
Las funciones que leen las env vars están en:
- `getTsaTimeoutMs()`: `supabase/functions/legal-timestamp/index.ts:177`
- `getDefaultTsaUrls()`: `supabase/functions/legal-timestamp/index.ts:184`

## Comportamiento del Sistema

1. **Request recibido** → lee TSA_TIMEOUT_MS y TSA_URLS
2. **Intenta primera URL** con timeout configurado
3. **Si falla** → intenta siguiente URL en la lista
4. **Si todas fallan** → retorna error 502 con detalles de todos los intentos
5. **Si alguna tiene éxito** → retorna el token con metadata

**Response incluye:**
```json
{
  "success": true,
  "token": "base64...",
  "tsa_url": "https://freetsa.org/tsr",  // URL que respondió
  "elapsed_ms": 1234,                     // Tiempo real tomado
  "timeout_ms": 15000                     // Timeout configurado
}
```

## Troubleshooting

### Error: "TSA request timeout"
- **Causa**: Request excedió TSA_TIMEOUT_MS
- **Solución**: Aumentar timeout o usar TSA más rápido
```bash
supabase secrets set TSA_TIMEOUT_MS=30000
```

### Error: "All TSAs failed"
- **Causa**: Ninguna URL en TSA_URLS respondió
- **Solución**:
  1. Verificar conectividad de red
  2. Probar URLs manualmente
  3. Agregar TSAs alternativos

### Env vars no se aplican
- **Causa**: Secrets no sincronizados con edge functions
- **Solución**: Re-deploy las funciones
```bash
supabase functions deploy legal-timestamp
```

## Archivo .gitignore

Asegúrate de que `.env.local` esté en `.gitignore`:

```bash
# Agregar si no está
echo "supabase/.env.local" >> .gitignore
```

## Scripts de Ayuda

### Script para configurar todo de una vez

Crea `scripts/setup-tsa-env.sh`:

```bash
#!/bin/bash
set -e

# Configuración
TIMEOUT="${TSA_TIMEOUT_MS:-15000}"
URLS="${TSA_URLS:-https://freetsa.org/tsr}"

echo "Configurando TSA environment variables..."
echo "  TSA_TIMEOUT_MS=$TIMEOUT"
echo "  TSA_URLS=$URLS"

# Producción
if [ "$1" = "prod" ]; then
  echo "Aplicando a producción..."
  supabase secrets set TSA_TIMEOUT_MS="$TIMEOUT"
  supabase secrets set TSA_URLS="$URLS"
  echo "✅ Secrets configurados en producción"

# Desarrollo
else
  echo "Aplicando a desarrollo local..."
  cat > supabase/.env.local << EOF
# TSA Configuration
TSA_TIMEOUT_MS=$TIMEOUT
TSA_URLS=$URLS
EOF
  echo "✅ Archivo supabase/.env.local creado"
fi
```

**Uso:**
```bash
# Desarrollo
./scripts/setup-tsa-env.sh

# Producción
./scripts/setup-tsa-env.sh prod

# Custom values
TSA_TIMEOUT_MS=30000 TSA_URLS="https://custom-tsa.com/tsr" ./scripts/setup-tsa-env.sh prod
```
