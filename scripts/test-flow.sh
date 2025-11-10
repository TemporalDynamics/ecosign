#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:8888"
JQ="$(command -v jq || true)"
if [ -z "$JQ" ]; then
  echo "jq no encontrado. Instala jq para mejor salida (brew install jq / apt install jq)."
fi

OWNER_EMAIL="${1:-owner@example.com}"
DOCUMENT_HASH="${2:-test-document-hash-123456}"  # reemplazar por el hash real
SIGNATURE_B64="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA" # placeholder (corta)

echo "1) Generando sign-url..."
SIGN_RESP=$(curl -s -X POST "$BASE/.netlify/functions/sign-url" \
  -H "Content-Type: application/json" \
  -d "{\"ownerEmail\":\"$OWNER_EMAIL\",\"sha256\":\"$DOCUMENT_HASH\"}")

echo "$SIGN_RESP" | ${JQ:-cat}
DOCID=$(echo "$SIGN_RESP" | ${JQ:-cat} -r '.docId // empty')
SIGNURL=$(echo "$SIGN_RESP" | ${JQ:-cat} -r '.signUrl // empty')
SHORTID=$(echo "$SIGN_RESP" | ${JQ:-cat} -r '.shortId // empty')
EXP=$(echo "$SIGN_RESP" | ${JQ:-cat} -r '.exp // empty')
SIG=$(echo "$SIGN_RESP" | ${JQ:-cat} -r '.sig // empty')

if [ -z "$DOCID" ] || [ -z "$SIGNURL" ] || [ -z "$SHORTID" ] || [ -z "$SIG" ] || [ -z "$EXP" ]; then
  echo "Fallo al generar sign-url. Response:"
  echo "$SIGN_RESP"
  exit 1
fi

echo "Sign URL: $SIGNURL"
echo "DocId: $DOCID"

echo "2) Simulando firma (log-acceptance)..."
ACCEPT_RESP=$(curl -s -X POST "$BASE/.netlify/functions/log-acceptance" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Test User\",
    \"email\":\"test+user@example.com\",
    \"organization\":\"Test Org\",
    \"signature\":\"$SIGNATURE_B64\",
    \"documentHash\":\"$DOCUMENT_HASH\",
    \"docId\":\"$DOCID\",
    \"shortId\":\"$SHORTID\",
    \"exp\":$EXP,
    \"sig\":\"$SIG\"
  }")

echo "$ACCEPT_RESP" | ${JQ:-cat}
ACCESSTOKEN=$(echo "$ACCEPT_RESP" | ${JQ:-cat} -r '.accessToken // empty')

if [ -z "$ACCESSTOKEN" ]; then
  echo "Fallo al crear acceptance. Response:"
  echo "$ACCEPT_RESP"
  exit 1
fi

echo "Access token: $ACCESSTOKEN"

echo "3) Verificando token..."
VERIFY_RESP=$(curl -s "$BASE/.netlify/functions/verify-access?token=$ACCESSTOKEN")
echo "$VERIFY_RESP" | ${JQ:-cat}

echo "4) Solicitando constancia JSON..."
curl -s -X POST "$BASE/.netlify/functions/generate-pdf" \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\":\"$ACCESSTOKEN\"}" -o constancia.json

echo "Constancia guardada en constancia.json"
jq . constancia.json || cat constancia.json

echo "TEST FLOW: OK"
