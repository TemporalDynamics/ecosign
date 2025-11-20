# Bitcoin Anchoring Worker Scripts

## 🎯 Propósito

Estos scripts procesan la cola de anclajes en Bitcoin usando OpenTimestamps. La función Edge `anchor-bitcoin` solo **encola** las solicitudes; estos workers las **procesan**.

## 📋 Arquitectura

```
Usuario → Edge Function (anchor-bitcoin) → DB (anchors table: queued)
                                                    ↓
                                    Worker Script (cada X minutos)
                                                    ↓
                            OpenTimestamps Calendar Servers
                                                    ↓
                                    DB (anchors table: pending → confirmed)
                                                    ↓
                                        Email Notification (opcional)
```

## 🔧 Instalación

### 1. Instalar dependencias Python

```bash
cd scripts/
pip3 install -r requirements.txt
```

O con pipx (recomendado para aislamiento):

```bash
pipx install opentimestamps-client
pip3 install resend
```

### 2. Configurar variables de entorno

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export RESEND_API_KEY="re_xxxxxxxxxxxx"  # Opcional, solo si quieres emails
```

## 🚀 Uso

### Script Simple (processAnchors.py)

Solo procesa anclajes, sin notificaciones:

```bash
python3 scripts/processAnchors.py --limit 10 --timeout 5
```

**Parámetros:**
- `--limit`: Máximo de anclajes a procesar por ejecución (default: 5)
- `--timeout`: Timeout para calendarios en segundos (default: 5)

### Script Completo (processAnchorsWithNotifications.py)

Procesa anclajes Y envía emails cuando se confirman:

```bash
# Procesar todo: crear proofs + seguimiento
python3 scripts/processAnchorsWithNotifications.py --mode both --limit 10

# Solo crear proofs
python3 scripts/processAnchorsWithNotifications.py --mode stamp --limit 10

# Solo hacer seguimiento y notificar
python3 scripts/processAnchorsWithNotifications.py --mode followup --limit 10
```

**Parámetros:**
- `--limit`: Máximo de anclajes por ejecución (default: 5)
- `--timeout`: Timeout de calendarios (default: 5)
- `--mode`: `stamp`, `followup`, o `both` (default: both)

## ⏰ Automatización con Cron

Para ejecutar automáticamente cada 5 minutos:

```bash
# Editar crontab
crontab -e

# Agregar esta línea:
*/5 * * * * cd /home/manu/verifysign && SUPABASE_URL="https://xxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="xxx" RESEND_API_KEY="xxx" /usr/bin/python3 scripts/processAnchorsWithNotifications.py --limit 20 >> /var/log/ecosign-anchors.log 2>&1
```

O crear un systemd timer (más robusto):

```bash
# /etc/systemd/system/ecosign-anchors.service
[Unit]
Description=EcoSign Bitcoin Anchoring Worker
After=network.target

[Service]
Type=oneshot
User=manu
WorkingDirectory=/home/manu/verifysign
Environment="SUPABASE_URL=https://xxx.supabase.co"
Environment="SUPABASE_SERVICE_ROLE_KEY=xxx"
Environment="RESEND_API_KEY=xxx"
ExecStart=/usr/bin/python3 scripts/processAnchorsWithNotifications.py --limit 20
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/systemd/system/ecosign-anchors.timer
[Unit]
Description=Run EcoSign Bitcoin Anchoring Worker every 5 minutes
Requires=ecosign-anchors.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

```bash
# Activar
sudo systemctl daemon-reload
sudo systemctl enable ecosign-anchors.timer
sudo systemctl start ecosign-anchors.timer

# Ver status
sudo systemctl status ecosign-anchors.timer
sudo journalctl -u ecosign-anchors.service -f
```

## 📊 Estados de Anclaje

| Estado | Descripción |
|--------|-------------|
| `queued` | Esperando procesamiento por el worker |
| `pending` | Proof OTS creado, esperando confirmación en Bitcoin |
| `confirmed` | Confirmado en blockchain (no implementado aún) |
| `failed` | Error durante el procesamiento |

## 🔍 Debugging

```bash
# Ver anclajes en cola
psql $DATABASE_URL -c "SELECT id, document_hash, anchor_status, created_at FROM anchors WHERE anchor_status='queued' ORDER BY created_at LIMIT 10;"

# Ver anclajes pendientes
psql $DATABASE_URL -c "SELECT id, document_hash, anchor_status, metadata FROM anchors WHERE anchor_status='pending';"

# Ver últimos errores
psql $DATABASE_URL -c "SELECT id, document_hash, metadata->>'stampError' as error FROM anchors WHERE anchor_status='failed' ORDER BY created_at DESC LIMIT 5;"
```

## 🚨 Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

Asegurate de exportar las variables de entorno antes de ejecutar:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
```

### Error: "No module named 'opentimestamps'"

Instalar dependencias:

```bash
pip3 install opentimestamps-client resend
```

### Error: "No queued anchors found"

Esto es normal si no hay anclajes pendientes. Para probar:

```bash
# Insertar un anclaje de prueba
psql $DATABASE_URL -c "INSERT INTO anchors (document_hash, anchor_type, anchor_status, user_id) VALUES ('abc123...', 'opentimestamps', 'queued', 'some-user-id');"
```

## 📝 Notas

- **Bitcoin tarda ~10 minutos** en incluir un bloque. Los proofs OTS se crean instantáneamente pero la confirmación final toma tiempo.
- El script NO espera la confirmación de Bitcoin en el modo actual. Solo crea el proof y marca como `pending`.
- Para verificación completa de confirmación Bitcoin, necesitarías usar `ots verify` o integrar la lógica de verificación.
- Los emails se envían cuando el anchor pasa de `queued` → `pending`. Para enviar cuando se confirme en Bitcoin, necesitarías implementar la verificación de confirmación.

## 🎯 Próximos Pasos

1. ✅ Script básico funcional
2. ⏳ Verificación de confirmación Bitcoin real
3. ⏳ Dashboard para monitorear cola
4. ⏳ Métricas y alertas
5. ⏳ Reintentos automáticos para fallos
