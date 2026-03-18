# Guía de Deploy — Beta Testing 2026-03-13

**Objetivo:** Liberar slots de deploy para beta testing sin romper funcionalidad

---

## Estado Actual

### Functions Deployadas
- **Total original:** 99 functions
- **Consolidadas (Fase 1):** 7 → 2 functions
- **Total actual:** 94 functions
- **Límite Free:** 100 functions
- **Disponibles:** 6 slots ✅

### Functions Consolidadas (Fase 1 - COMPLETADA)
- ✅ `supervision` (3 → 1 function) - Deployed 2026-03-17
  - Estado: ✅ Lista para deploy
  - Ahorro: 2 slots
- ✅ `admin-trials` (4 → 1 function) - Deployed 2026-03-17
  - Estado: ✅ Lista para deploy
  - Ahorro: 3 slots

**Total Fase 1:** 5 slots liberados

---

## Próximos Pasos

### 1. Deploy de functions consolidadas (INMEDIATO)

**Comandos:**
```bash
cd supabase
supabase functions deploy supervision
supabase functions deploy admin-trials
```

**Verificación:**
```bash
# Probar supervision dashboard
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/supervision' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_dashboard"}'

# Probar admin-trials grant_trial
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/admin-trials' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{"action": "grant_trial", "email": "test@example.com"}'
```

**Monitoreo:** 48-72 horas

---

### 2. Actualizar Cliente ( después de 48-72 horas)

**Archivos a actualizar:**
- `client/src/pages/SupervisionCenterPage.tsx` → cambiar invocaciones a `supervision`
- `client/src/lib/supervisionService.ts` → actualizar para usar nueva función

**Cambios:**
```typescript
// Antes
await supabase.functions.invoke('supervision-dashboard')
await supabase.functions.invoke('supervision-invite-member', { body })
await supabase.functions.invoke('supervision-member-action', { body })

// Después
await supabase.functions.invoke('supervision', { body: { action: 'get_dashboard' } })
await supabase.functions.invoke('supervision', { body: { action: 'invite_member', ... } })
await supabase.functions.invoke('supervision', { body: { action: 'member_action', ... } })
```

---

### 3. Borrar Functions Viejas (después de confirmar estabilidad)

**Comandos:**
```bash
supabase functions delete supervision-dashboard
supabase functions delete supervision-invite-member
supabase functions delete supervision-member-action
supabase functions delete admin-expire-workspace-trials
supabase functions delete admin-grant-workspace-trial
supabase functions delete admin-invite-workspace-member
supabase functions delete admin-issue-trial-offer
```

**Ahorro total:** 5 slots liberados

---

## Functions Restantes para Consolidar

### Fase 2 (Opcional - No prioritario para beta)

**Funciones a consolidar:**
- `anchor-health`, `anchoring-health-check`, `health`, `health-check` → `system-health` (4 → 1)
- `notify-document-certified`, `notify-document-signed`, `notify-artifact-ready` → `notifications` (3 → 1)

**Ahorro potencial:** 5 slots adicionales

**Estado:** ⏳ No prioritario (ya tenemos 6 slots libres para beta)

---

## Slots Liberados

| Fase | Functions Viejas | Nueva Function | Ahorro | Acumulado |
|------|------------------|----------------|--------|-----------|
| **Fase 1a** | 3 (supervision-*) | `supervision` | 2 | 2 |
| **Fase 1b** | 4 (admin-*) | `admin-trials` | 3 | 5 |

**Total Fase 1:** 5 slots liberados ✅

**Slots disponibles:** 6 (99 - 5 = 94 deployadas, límite 100)

---

## Rollback Plan

Si hay problemas con `supervision`:

1. **No borrar funciones viejas** (mantener las 3 originales)
2. **Revertir cliente** a llamar funciones viejas
3. **Investigar error** en logs de Supabase
4. **Fixear y redeployar** nueva función
5. **Reintentar** después de fix

**Regla de oro:** Nunca borrar funciones viejas hasta que la nueva esté estable por 48-72 horas.

---

## Checklist de Deploy

### Deploy Inicial
- [ ] `supabase functions deploy supervision`
- [ ] `supabase functions deploy admin-trials`
- [ ] Probar `get_dashboard` action (supervision)
- [ ] Probar `grant_trial` action (admin-trials)
- [ ] Probar `invite_member` action (ambas functions)
- [ ] Verificar logs en Supabase Dashboard
- [ ] Verificar CORS (que funcione desde el frontend)

### Monitoreo (48-72 horas)
- [ ] Revisar logs diarios de supervision
- [ ] Revisar logs diarios de admin-trials
- [ ] Verificar que no hay errores 500
- [ ] Confirmar que dashboard carga correctamente
- [ ] Confirmar que invitaciones se envían
- [ ] Confirmar que grant_trial funciona

### Limpieza (después de 48-72 horas)
- [ ] Actualizar cliente para usar nuevas functions
- [ ] Deploy del cliente actualizado
- [ ] Verificar que todo funciona
- [ ] Borrar 7 functions viejas remotas
- [ ] Actualizar este documento

---

## Contacto

**Owner:** Product/Engineering  
**Deploy Date:** 2026-03-17  
**Next Review:** 2026-03-19 (48 horas post-deploy)

---

**FIN DEL DOCUMENTO**
