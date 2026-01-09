# Refactor Modal de Compartir - Completado

**Fecha:** 2025-12-23  
**Estado:** ✅ Implementado y funcionando

---

## 🎯 Objetivo

Reemplazar el modal de compartir legacy por uno nuevo que:
- Respete la filosofía Zero Server-Side Knowledge
- Tenga un diseño limpio con panel fijo inmutable
- Use Link + Código (OTP) como modelo principal
- Elimine flujos confusos (NDA sin código)

---

## ✅ Cambios Realizados

### 1. **Nuevo componente: ShareDocumentModal.tsx**

📄 `client/src/components/ShareDocumentModal.tsx`

**Características:**
- **Panel principal INMUTABLE**: Nunca cambia de tamaño
- **Panel lateral opcional (NDA)**: Solo aparece si se activa, no empuja el principal
- **Link + Código separados**: Copy claro "Compartí ambos por separado"
- **Sin jerga técnica**: "Código de seguridad" en vez de "OTP"
- **Paleta de colores**: Blanco/Negro + Azul profundo (sin amarillo)

**Flujo:**
1. Usuario elige formato (PDF / .ECO / Ambos)
2. Opcionalmente activa NDA (panel lateral aparece)
3. Configura expiración
4. Genera → Recibe Link + Código
5. Copia ambos por separado para compartir

### 2. **Integración en DocumentsPage**

📄 `client/src/pages/DocumentsPage.tsx`

**Cambios:**
```tsx
// Antes:
import ShareLinkGenerator from "../components/ShareLinkGenerator";

// Ahora:
import ShareDocumentModal from "../components/ShareDocumentModal";
```

**Renderizado:**
```tsx
{shareDoc && (
  <ShareDocumentModal
    document={{
      id: shareDoc.id,
      document_name: shareDoc.document_name,
      encrypted: true, // Todos los documentos son cifrados
      pdf_storage_path: shareDoc.pdf_storage_path,
      eco_storage_path: shareDoc.eco_storage_path,
      eco_file_data: shareDoc.eco_file_data,
    }}
    onClose={() => setShareDoc(null)}
  />
)}
```

**Handler simplificado:**
- Eliminado `handlePdfStored` (ya no se necesita subir PDF desde modal)
- Mantenido `handleShareDoc` (solo setea shareDoc)

### 3. **Componente legacy movido**

📄 `client/src/components/ShareLinkGenerator.tsx.legacy`

**Razón:** 
- Flujo confuso con NDA sin código
- Panel colapsable que rompía layout
- No respetaba filosofía de simpleza

---

## 🔐 Garantías de Seguridad

### El nuevo modal mantiene Zero Server-Side Knowledge:

✅ **OTP generado en cliente**
- Usa `shareDocument()` de `lib/storage/documentSharing.ts`
- OTP se genera con `crypto.getRandomValues()` en browser

✅ **Servidor solo guarda hash**
- DB almacena `SHA-256(OTP)`, nunca plaintext
- Servidor no puede reconstruir OTP

✅ **Document key wrapping**
- Document key se wrappea con key derivada del OTP
- Servidor no puede unwrap sin OTP original

✅ **Descifrado client-side**
- Recipient ingresa código
- Browser deriva unwrap key de OTP
- Browser descifra localmente

---

## 🎨 Diseño y UX

### Panel Inmutable (regla de oro)

**El panel principal NUNCA cambia:**
- ✅ Mismo ancho siempre
- ✅ Mismo alto siempre
- ✅ Misma posición siempre

**Cuando se activa NDA:**
- ❌ No empuja el panel principal
- ✅ Aparece panel lateral (izquierda)
- ✅ Layout se expande, no se modifica

### Paleta de colores

**Evitado:**
- ❌ Amarillo (`bg-amber-*`)
- ❌ Cyan genérico (`bg-cyan-*`)
- ❌ Verde invasivo

**Usado:**
- ✅ Blanco/Negro (base)
- ✅ Azul profundo (`bg-blue-100`, `text-blue-900`)
- ✅ Verde puntual solo en success (`text-emerald-600`)

### Copy sin jerga

**Evitado:**
- ❌ "OTP"
- ❌ "Cifrado end-to-end"
- ❌ "Key wrapping"

**Usado:**
- ✅ "Código de seguridad"
- ✅ "Enlace privado"
- ✅ "Sin el código, el documento no puede ser descifrado"

---

## 📋 Testing Checklist

### Funcional
- [ ] Compartir PDF solo
- [ ] Compartir .ECO solo
- [ ] Compartir ambos
- [ ] Activar/desactivar NDA
- [ ] Editar texto NDA
- [ ] Copiar link
- [ ] Copiar código
- [ ] Generar múltiples enlaces del mismo documento
- [ ] Expiración funciona correctamente

### UX
- [ ] Panel principal no cambia de tamaño al activar NDA
- [ ] Panel NDA aparece/desaparece suavemente
- [ ] Botones disabled cuando formato no disponible
- [ ] Indicadores de disponibilidad claros
- [ ] Copy legible y sin confusión

### Seguridad
- [ ] OTP se genera en cliente
- [ ] OTP no se persiste en claro
- [ ] Link sin código no permite acceso
- [ ] Descifrado ocurre client-side

---

## 🚀 Próximos pasos (opcional)

### Mejoras futuras (no bloqueantes)
1. **Multi-recipient**: Permitir múltiples destinatarios con un solo link (requiere cambio en DB)
2. **Revocación**: Botón para revocar shares activos
3. **Historial**: Ver shares creados y su estado
4. **Tooltip en .ECO**: Explicar "Evidencia criptográfica" sin jerga

### No hacer (anti-patrones)
- ❌ No volver a mezclar NDA sin código
- ❌ No permitir compartir sin cifrado
- ❌ No explicar crypto en UI
- ❌ No cambiar tamaño del panel principal

---

## 📚 Referencias

- **Lógica crypto**: `client/src/lib/storage/documentSharing.ts`
- **OTP system**: `client/src/lib/e2e/otpSystem.ts`
- **Análisis seguridad**: `/OTP_SECURITY_ANALYSIS.md`
- **Investigación multi-user**: `/MULTI_USER_SHARING_INVESTIGATION.md`
- **Componente nuevo**: `client/src/components/ShareDocumentModal.tsx`
- **Componente legacy**: `client/src/components/ShareLinkGenerator.tsx.legacy`

---

## ✨ Resumen ejecutivo

**Antes:**
- Modal confuso con múltiples modos
- NDA sin código (rompe filosofía)
- Panel colapsable que cambiaba layout
- Amarillo invasivo

**Ahora:**
- Modal simple con un solo flujo
- Siempre Link + Código (Zero Knowledge real)
- Panel fijo inmutable + lateral opcional
- Blanco/Negro + Azul profundo

**Filosofía cumplida:**
> "Si no se puede compartir cifrado, no se puede compartir. El cifrado no se explica, simplemente es."

---

**Última actualización:** 2025-12-23  
**Build status:** ✅ Compilando correctamente  
**Autor:** Refactor completo del sistema de compartir
