# Plan de Rotación de Claves Pre-MVP

## 🎯 Objetivo

Rotar todas las claves API y secretos antes del lanzamiento público del MVP para garantizar:
- ✅ Ningún secreto quede expuesto en commits antiguos
- ✅ Ninguna clave esté en logs, SQL scripts o archivos de configuración
- ✅ Sistema completamente seguro para usuarios reales

---

## 📋 Checklist de Claves a Rotar

### 1. Supabase

| Clave | Ubicación | Acción | Prioridad |
|-------|-----------|--------|-----------|
| `SUPABASE_ANON_KEY` | Client-side, .env | ✅ Regenerar | Alta |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side, Edge Functions | ✅ Regenerar | **Crítica** |
| `SUPABASE_DB_URL` | Backend | ⚠️ No rotable (usar nueva instancia si compromiso) | Media |

**Cómo rotar**:
1. Dashboard Supabase → Settings → API → Generate new anon key
2. Actualizar en todas las Edge Functions
3. Actualizar en cliente (rebuild y redeploy)
4. Verificar que no haya hardcoded en código

---

### 2. Resend (Email)

| Clave | Ubicación | Acción | Prioridad |
|-------|-----------|--------|-----------|
| `RESEND_API_KEY` | Edge Functions secrets | ✅ Regenerar | Alta |

**Cómo rotar**:
1. Dashboard Resend → API Keys → Create API Key (con nombre descriptivo: "EcoSign Production v2")
2. Revocar la clave anterior
3. Actualizar en Supabase Edge Functions → Environment Variables
4. Probar con `test-resend-email.js`

---

### 3. Blockchain & Crypto

| Clave | Ubicación | Acción | Prioridad |
|-------|-----------|--------|-----------|
| `ECO_SIGNING_PRIVATE_KEY` | Edge Functions secrets | ✅ Regenerar | **Crítica** |
| `POLYGON_PRIVATE_KEY` | Edge Functions secrets | ✅ Regenerar | **Crítica** |
| `SPONSOR_PRIVATE_KEY` | Edge Functions secrets | ✅ Regenerar | **Crítica** |
| `MASTER_ENCRYPTION_KEY` | Edge Functions secrets | ✅ Regenerar | **Crítica** |
| `NDA_ENCRYPTION_KEY` | Edge Functions secrets | ✅ Regenerar | Alta |

**Cómo rotar**:
1. Generar nuevas private keys usando script seguro
2. Transferir fondos de wallets antiguas a nuevas (si aplica)
3. Actualizar en Supabase secrets
4. **NUNCA** commitear las claves al repositorio

---

### 4. Servicios Externos

| Servicio | Clave | Acción | Prioridad |
|----------|-------|--------|-----------|
| Alchemy | `ALCHEMY_API_KEY` | ✅ Regenerar | Media |
| Biconomy | `BICONOMY_BUNDLER_API_KEY`, `BICONOMY_PAYMASTER_API_KEY` | ✅ Regenerar | Media |
| SignNow | `SIGNNOW_API_KEY`, `SIGNNOW_API_TOKEN` | ✅ Regenerar | Media |

---

### 5. Otros Secretos

| Secreto | Ubicación | Acción | Prioridad |
|---------|-----------|--------|-----------|
| `CSRF_SECRET` | Edge Functions | ✅ Regenerar | Alta |
| `MFA_SERVICE_API_KEY` | Edge Functions | ✅ Regenerar | Alta |
| `SIGNNOW_WEBHOOK_SECRET` | Edge Functions | ✅ Regenerar | Media |
| `ALCHEMY_WEBHOOK_AUTH_TOKEN` | Edge Functions | ✅ Regenerar | Baja |

---

## 📝 Procedimiento de Rotación

### Fase 1: Preparación (1-2 días antes)

1. **Auditoría de secretos en código**
   ```bash
   # Buscar secretos hardcoded
   git log -S "eyJ" --all
   git log -S "re_" --all
   git log -S "sk_" --all

   # Buscar en archivos actuales
   grep -r "eyJ" . --exclude-dir=node_modules --exclude-dir=.git
   grep -r "SUPABASE_SERVICE_ROLE" . --exclude-dir=node_modules
   ```

2. **Backup completo**
   - Backup de base de datos
   - Backup de configuración actual
   - Documentar todas las claves actuales (en lugar seguro, ej: 1Password)

3. **Lista de variables de entorno**
   ```bash
   supabase secrets list > secrets_backup.txt
   ```

---

### Fase 2: Rotación (día del cambio)

#### A. Rotar claves de Supabase

```bash
# 1. Generar nuevas claves en Dashboard
# 2. Actualizar en .env local
# 3. Actualizar en Vercel/producción
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 4. Actualizar en Edge Functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=nueva_clave
```

#### B. Rotar Resend API Key

```bash
# 1. Crear nueva clave en Resend Dashboard
# 2. Actualizar en Supabase
supabase secrets set RESEND_API_KEY=nueva_clave

# 3. Probar
RESEND_API_KEY=nueva_clave node test-resend-email.js test@ejemplo.com

# 4. Revocar clave antigua en Resend Dashboard
```

#### C. Rotar claves de blockchain

```bash
# 1. Generar nuevas private keys (usar script seguro)
# 2. Transferir fondos de wallets antiguas
# 3. Actualizar secrets
supabase secrets set ECO_SIGNING_PRIVATE_KEY=nueva_clave
supabase secrets set POLYGON_PRIVATE_KEY=nueva_clave
supabase secrets set SPONSOR_PRIVATE_KEY=nueva_clave

# 4. Verificar que las nuevas wallets tienen fondos
```

#### D. Rotar encryption keys

```bash
# Generar nuevas claves con openssl
openssl rand -hex 32  # Para MASTER_ENCRYPTION_KEY
openssl rand -hex 32  # Para NDA_ENCRYPTION_KEY

# Actualizar
supabase secrets set MASTER_ENCRYPTION_KEY=nueva_clave
supabase secrets set NDA_ENCRYPTION_KEY=nueva_clave
```

---

### Fase 3: Verificación (inmediatamente después)

1. **Test end-to-end completo**
   - Crear cuenta nueva
   - Subir documento
   - Crear workflow de firma
   - Verificar que llegue email
   - Firmar documento
   - Verificar anclaje blockchain
   - Descargar certificado

2. **Monitorear logs**
   ```bash
   # Ver logs de Edge Functions
   supabase functions logs send-pending-emails --project-ref PROJECT_REF
   ```

3. **Verificar que no haya errores de autenticación**
   - Revisar dashboard Supabase → Logs
   - Revisar dashboard Resend → Activity
   - Revisar dashboard Alchemy → Requests

---

### Fase 4: Limpieza

1. **Eliminar secretos del historial de Git (si están expuestos)**
   ```bash
   # SOLO SI es necesario - esto reescribe el historial
   # Usar con extrema precaución
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   # Forzar push (requiere permisos)
   git push origin --force --all
   ```

2. **Revocar claves antiguas**
   - En cada servicio (Resend, Alchemy, etc.), ir a API Keys y revocar las antiguas
   - Verificar que nadie pueda usarlas

3. **Actualizar documentación**
   - Documentar las nuevas claves en gestor de contraseñas del equipo
   - Actualizar README con instrucciones de configuración

---

## ⚠️ Consideraciones Importantes

### Antes de rotar claves de blockchain:

1. **Transferir fondos primero**
   - Las wallets antiguas pueden tener MATIC, ETH, etc.
   - Transferir todo a las nuevas wallets antes de revocar

2. **Verificar contratos inteligentes**
   - Si hay contratos que usan las wallets antiguas como owner/admin
   - Transferir ownership a las nuevas wallets

### Antes de rotar encryption keys:

⚠️ **CRÍTICO**: Si rotas `MASTER_ENCRYPTION_KEY` o `NDA_ENCRYPTION_KEY`:
- **Los datos encriptados con la clave antigua NO se podrán desencriptar**
- Solo rotar si:
  1. No hay datos en producción aún (pre-MVP)
  2. O implementas re-encriptación de datos existentes

**Alternativa segura**: Si ya hay datos en producción:
1. Crear nueva columna `encryption_key_version`
2. Mantener ambas claves (antigua y nueva)
3. Gradualmente re-encriptar datos con nueva clave
4. Deprecar clave antigua después de 6 meses

---

## 📅 Timeline Recomendado

| Fase | Duración | Cuándo |
|------|----------|--------|
| Preparación | 2 días | 1 semana antes del MVP |
| Rotación | 4 horas | Fin de semana / baja actividad |
| Verificación | 24 horas | Inmediatamente después |
| Limpieza | 1 día | Dentro de la semana siguiente |

---

## 🔐 Buenas Prácticas Post-Rotación

1. **Nunca más commitear secretos**
   - Usar `.env.example` con valores de ejemplo
   - Agregar `.env*` a `.gitignore`
   - Usar pre-commit hooks para detectar secretos

2. **Usar gestor de secretos**
   - 1Password / Bitwarden para el equipo
   - Supabase Vault para secretos de producción
   - GitHub Secrets solo para CI/CD

3. **Rotar periódicamente**
   - Cada 6 meses: claves de servicios externos
   - Cada 12 meses: claves de blockchain (si hay fondos mínimos)
   - Inmediatamente: si hay sospecha de compromiso

4. **Monitorear uso de claves**
   - Configurar alertas en Supabase / Resend / Alchemy para uso anormal
   - Revisar logs mensualmente

---

## ✅ Checklist Final

Antes de considerar completa la rotación, verificar:

- [ ] Todas las claves antiguas revocadas en servicios externos
- [ ] Nuevas claves documentadas en gestor de contraseñas
- [ ] Tests end-to-end pasando al 100%
- [ ] Sin errores en logs de producción
- [ ] Sin secretos en código (verificado con grep/git log)
- [ ] Equipo informado de cambios
- [ ] Documentación actualizada
- [ ] Backup de BD post-rotación realizado

---

## 🆘 Plan de Rollback

Si algo falla durante la rotación:

1. **Restaurar claves antiguas inmediatamente**
   ```bash
   supabase secrets set RESEND_API_KEY=clave_antigua
   ```

2. **Verificar servicios**
   - Probar envío de email
   - Probar firma de documento
   - Verificar anclaje blockchain

3. **Investigar causa**
   - Revisar logs
   - Identificar qué clave causó el problema
   - Rotar solo esa clave individualmente

4. **Comunicar al equipo**
   - Notificar del rollback
   - Documentar lecciones aprendidas
   - Planear nueva fecha para rotación

---

**Última actualización**: 2025-11-28
**Responsable**: Equipo DevOps EcoSign
**Próxima revisión**: Antes del lanzamiento MVP
