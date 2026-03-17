# Supervision Edge Function (Consolidated)

**Estado:** ✅ Deployed (Fase 1)  
**Reemplaza a:** `supervision-dashboard`, `supervision-invite-member`, `supervision-member-action`  
**Ahorro:** 2 slots (3 functions → 1 function)

---

## Request Pattern

```typescript
POST /functions/v1/supervision

{
  "action": "get_dashboard" | "invite_member" | "member_action",
  "workspace_id": "...",
  // ... payload específico por acción
}
```

---

## Acciones Disponibles

### 1. `get_dashboard` (GET o POST)

Obtiene el dashboard completo de supervisión del workspace.

**Request:**
```json
{
  "action": "get_dashboard",
  "workspace_id": "..." // opcional, usa el primero del usuario si no se provee
}
```

**Response:**
```json
{
  "ok": true,
  "actor": { "user_id": "...", "role": "owner_supervisor" },
  "workspace": { "id": "...", "name": "...", "owner_id": "...", "created_at": "..." },
  "plan": { "plan_status": "...", "trial_ends_at": "...", "agent_seats_limit": 10, ... },
  "usage": { "operations_active": 5, "operations_created": 10, ... },
  "summary": { "active_users": 3, "pending_invites": 1, ... },
  "limits": { "supervisors": { "used": 2, "limit": 5 }, "agents": { "used": 3, "limit": 10 } },
  "members": [...],
  "recent_documents": [...],
  "activity": [...]
}
```

---

### 2. `invite_member` (POST)

Invita un miembro al workspace.

**Request:**
```json
{
  "action": "invite_member",
  "workspace_id": "...",
  "email": "usuario@email.com",
  "role": "agent" | "supervisor_admin"
}
```

**Response:**
```json
{
  "ok": true,
  "invited_user_id": "..."
}
```

**Errores comunes:**
- `not_supervisor` (403): El usuario no es supervisor del workspace
- `only_owner_can_invite_supervisors` (403): Solo owner puede invitar supervisors
- `agent_seat_limit_reached` (409): Se alcanzó el límite de agent seats
- `supervisor_seat_limit_reached` (409): Se alcanzó el límite de supervisor seats

---

### 3. `member_action` (POST)

Ejecuta acciones sobre un miembro existente.

**Request:**
```json
{
  "action": "member_action",
  "workspace_id": "...",
  "member_id": "...",
  "action": "suspend" | "activate" | "remove_invite" | "change_role" | "resend_invite",
  "role": "agent" | "supervisor_admin" // solo para change_role
}
```

**Acciones disponibles:**

| Acción | Descripción | Permisos |
|--------|-------------|----------|
| `suspend` | Suspender miembro | Supervisor |
| `activate` | Activar miembro suspendido | Supervisor |
| `remove_invite` | Remover invitación pendiente | Supervisor |
| `change_role` | Cambiar rol de miembro | Solo Owner |
| `resend_invite` | Reenviar invitación | Supervisor |

**Response:**
```json
{
  "ok": true
}
```

**Errores comunes:**
- `member_not_found` (404): El miembro no existe
- `not_supervisor` (403): El usuario no es supervisor
- `insufficient_permissions` (403): No tiene permisos para esta acción
- `not_invited` (409): La acción requiere que el miembro esté invitado
- `invalid_role` (400): El rol especificado no es válido

---

## Auth

**Requerido:** Bearer token (JWT de Supabase)

**Permisos:**
- `owner_supervisor`: Acceso completo al workspace
- `supervisor_admin`: Acceso limitado (no puede invitar supervisors ni cambiar roles)

---

## CORS

**Orígenes permitidos:**
- `ALLOWED_ORIGIN` (env)
- `SITE_URL` (env)
- `FRONTEND_URL` (env)
- Default: `http://localhost:5173`

---

## Ejemplos de Uso

### Dashboard (GET)

```typescript
const { data, error } = await supabase.functions.invoke('supervision', {
  body: { action: 'get_dashboard' }
})
```

### Invitar miembro

```typescript
const { data, error } = await supabase.functions.invoke('supervision', {
  body: {
    action: 'invite_member',
    workspace_id: '...',
    email: 'usuario@email.com',
    role: 'agent'
  }
})
```

### Suspender miembro

```typescript
const { data, error } = await supabase.functions.invoke('supervision', {
  body: {
    action: 'member_action',
    workspace_id: '...',
    member_id: '...',
    action: 'suspend'
  }
})
```

---

## Migración desde funciones viejas

### Antes (3 funciones separadas):

```typescript
// Dashboard
await supabase.functions.invoke('supervision-dashboard')

// Invitar
await supabase.functions.invoke('supervision-invite-member', {
  body: { workspace_id: '...', email: '...', role: 'agent' }
})

// Acciones
await supabase.functions.invoke('supervision-member-action', {
  body: { workspace_id: '...', member_id: '...', action: 'suspend' }
})
```

### Después (1 función consolidada):

```typescript
// Dashboard
await supabase.functions.invoke('supervision', {
  body: { action: 'get_dashboard' }
})

// Invitar
await supabase.functions.invoke('supervision', {
  body: { action: 'invite_member', workspace_id: '...', email: '...', role: 'agent' }
})

// Acciones
await supabase.functions.invoke('supervision', {
  body: { action: 'member_action', workspace_id: '...', member_id: '...', action: 'suspend' }
})
```

---

## Deploy

```bash
cd supabase/functions/supervision
deno task deploy supervision
```

O desde Supabase Dashboard:
1. Ir a Edge Functions
2. Click en "Deploy function"
3. Seleccionar `supervision`

---

## Monitoreo

Después del deploy:
1. Verificar logs en Supabase Dashboard
2. Probar las 3 acciones desde el cliente
3. Monitorear por 48-72 horas
4. Si todo bien, borrar funciones viejas remotas

---

## Rollback

Si hay problemas:
1. Revertir cliente a llamar funciones viejas
2. Investigar error en logs
3. Fixear y redeployar

**Las funciones viejas NO se borran hasta que la nueva esté estable por 48-72 horas.**

---

## Código

```
supervision/
├── index.ts              # Router principal
├── helpers.ts            # Funciones compartidas
└── handlers/
    ├── getDashboard.ts   # Handler: get_dashboard
    ├── inviteMember.ts   # Handler: invite_member
    └── memberAction.ts   # Handler: member_action
```

---

**FIN DEL DOCUMENTO**
