# Guía de Deploy — Beta Testing 2026-03-13

**Objetivo:** Liberar slots de deploy para beta testing sin romper funcionalidad

---

## Estado Actual

### Functions Deployadas
- **Total:** 99 functions
- **Límite Free:** 100 functions
- **Disponibles:** 1 slot

### Functions Consolidadas (Fase 1)
- ✅ `supervision` (3 → 1 function)
  - Deployed: 2026-03-17
  - Estado: ✅ Lista para usar
  - Ahorro: 2 slots

---

## Próximos Pasos

### 1. Deploy de `supervision` (INMEDIATO)

**Comando:**
```bash
cd supabase
supabase functions deploy supervision
```

**Verificación:**
```bash
# Probar dashboard
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/supervision' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{"action": "get_dashboard"}'

# Probar invite
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/supervision' \
  -H 'Authorization: Bearer <service-role-key>' \
  -H 'Content-Type: application/json' \
  -d '{"action": "invite_member", "workspace_id": "...", "email": "...", "role": "agent"}'
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
```

**Ahorro total:** 2 slots liberados

---

## Functions Restantes para Consolidar

### Admin-Trials (Fase 1 - Pendiente)

**Funciones a consolidar:**
- `admin-expire-workspace-trials`
- `admin-grant-workspace-trial`
- `admin-invite-workspace-member`
- `admin-issue-trial-offer`

**Nueva función:** `admin-trials` (4 → 1 function)
**Ahorro potencial:** 3 slots

**Estado:** ⏳ Pendiente de implementación

---

## Slots Liberados

| Fase | Functions Viejas | Nueva Function | Ahorro | Acumulado |
|------|------------------|----------------|--------|-----------|
| **Fase 1a** | 3 (supervision-*) | `supervision` | 2 | 2 |
| **Fase 1b** | 4 (admin-*) | `admin-trials` | 3 | 5 |

**Total Fase 1:** 5 slots liberados

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
- [ ] Probar `get_dashboard` action
- [ ] Probar `invite_member` action
- [ ] Probar `member_action` action
- [ ] Verificar logs en Supabase Dashboard
- [ ] Verificar CORS (que funcione desde el frontend)

### Monitoreo (48-72 horas)
- [ ] Revisar logs diarios
- [ ] Verificar que no hay errores 500
- [ ] Confirmar que dashboard carga correctamente
- [ ] Confirmar que invitaciones se envían
- [ ] Confirmar que acciones de miembros funcionan

### Limpieza (después de 48-72 horas)
- [ ] Actualizar cliente para usar nueva función
- [ ] Deploy del cliente actualizado
- [ ] Verificar que todo funciona
- [ ] Borrar funciones viejas remotas
- [ ] Actualizar este documento

---

## Contacto

**Owner:** Product/Engineering  
**Deploy Date:** 2026-03-17  
**Next Review:** 2026-03-19 (48 horas post-deploy)

---

**FIN DEL DOCUMENTO**
