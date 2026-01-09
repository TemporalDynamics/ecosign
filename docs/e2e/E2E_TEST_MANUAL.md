# VerifySign - Tests E2E Manuales

Documentación de pruebas end-to-end para validar los 3 flujos principales del MVP.

---

## FLUJO 1: Certificar Documento

### Pre-requisitos
- [ ] Usuario autenticado en VerifySign
- [ ] Documento PDF de prueba (< 10MB)
- [ ] Buckets de Supabase configurados

### Pasos

1. **Login**
   - Ir a `/login`
   - Ingresar credenciales
   - Verificar redirect a `/dashboard`

2. **Abrir flujo de certificación**
   - Click en "Certificar documento"
   - Verificar que se abre el modal de certificación

3. **Subir documento**
   - Arrastrar o seleccionar PDF
   - Verificar que muestra nombre y tamaño
   - Verificar que avanza al paso 2 (Firma legal)

4. **Firma legal (opcional)**
   - Si se firma: dibujar firma en SignatureWorkshop
   - Si se salta: click en "Continuar solo con certificación"
   - Verificar avance al paso 3 (Certificar)

5. **Opciones de certificación**
   - Activar/desactivar "Timestamp RFC 3161"
   - Activar/desactivar "Anclaje en Bitcoin"
   - Click en "Generar certificado .ECO"

6. **Validar resultado**
   - [ ] Archivo .ECO se descarga automáticamente
   - [ ] Muestra hash del documento
   - [ ] Muestra timestamp
   - [ ] Si se guardó en nube: "Guardado en tu cuenta"
   - [ ] Si hay anclaje Bitcoin: "Anclaje en proceso"

7. **Verificar persistencia**
   - Cerrar modal
   - Verificar que documento aparece en lista del dashboard
   - Verificar estadísticas actualizadas

### Resultado esperado
✅ Documento certificado con .ECO descargado y guardado en Supabase

---

## FLUJO 2: Compartir con NDA (VerifyTracker)

### Pre-requisitos
- [ ] Documento ya certificado en el sistema
- [ ] Email de prueba válido
- [ ] Edge functions desplegadas: `generate-link`, `verify-access`, `accept-nda`

### Pasos desde Owner

1. **Generar enlace**
   - En dashboard, ir a documento certificado
   - Click en "Compartir" o "Generar enlace"
   - Ingresar email del destinatario
   - Configurar expiración (ej: 72 horas)
   - Activar "Requerir NDA"
   - Click en "Generar enlace"

2. **Validar enlace generado**
   - [ ] URL generada con token de 64 caracteres
   - [ ] Muestra email del destinatario
   - [ ] Muestra fecha de expiración
   - [ ] Opción de copiar al portapapeles

### Pasos desde Invitado

3. **Acceder al enlace (incógnito)**
   - Abrir navegador incógnito
   - Pegar URL generada: `/nda/{token}`
   - Verificar que carga información del documento

4. **Verificar página NDA**
   - [ ] Muestra título del documento
   - [ ] Muestra fecha de expiración
   - [ ] Formulario con campos: nombre, email, checkbox
   - [ ] Texto del NDA visible

5. **Aceptar NDA**
   - Completar nombre completo
   - Completar email
   - Leer términos del NDA
   - Marcar checkbox "Acepto los términos"
   - Click en "Acepto los términos del NDA"

6. **Validar aceptación**
   - [ ] Mensaje de "Acceso autorizado"
   - [ ] Botón "Descargar documento" visible
   - [ ] Botón "Descargar certificado .ECO" visible
   - [ ] CTA para crear cuenta gratis

7. **Descargar documento**
   - Click en "Descargar documento"
   - Verificar que se registra evento de descarga

### Validar en Dashboard (Owner)

8. **Ver logs de acceso**
   - Volver al dashboard como owner
   - Ir a sección VerifyTracker
   - [ ] Ver enlace creado con estado
   - [ ] Ver log de accesos: view, NDA accepted, download
   - [ ] Metadata: IP, user-agent, timestamp, país

### Resultado esperado
✅ Enlace generado, NDA aceptado, documento descargado, logs registrados

---

## FLUJO 3: Verificar Público

### Pre-requisitos
- [ ] Archivo .ECO válido (generado en Flujo 1)
- [ ] Archivo original correspondiente (opcional)

### Pasos

1. **Acceder a verificador**
   - Ir a `/verify`
   - Sin necesidad de login

2. **Subir .ECO**
   - Arrastrar o seleccionar archivo .ecox
   - Verificar que muestra nombre y tamaño
   - Verificar validación de formato

3. **Subir archivo original (opcional)**
   - Arrastrar archivo original
   - Verificar mensaje "Archivo original cargado"

4. **Ejecutar verificación**
   - Click en "Verificar Documento"
   - Esperar procesamiento

5. **Validar resultado**

   **Caso A: .ECO válido + archivo correcto**
   - [ ] Estado: 🟢 VERDE "Verificación completa"
   - [ ] Firma Ed25519: "Válida"
   - [ ] Hash del documento: "Coincide"
   - [ ] Timestamp: Fecha mostrada
   - [ ] Formato .ECO: "Válido"

   **Caso B: .ECO válido + archivo modificado**
   - [ ] Estado: 🔴 ROJO "Documento no válido"
   - [ ] Hash: "No coincide"
   - [ ] Mensaje claro de que el archivo fue alterado

   **Caso C: Solo .ECO (sin original)**
   - [ ] Estado: 🟡 AMARILLO "Verificación parcial"
   - [ ] Firma: "Válida"
   - [ ] Hash: "Pendiente - falta archivo original"
   - [ ] Mensaje: "El certificado es válido"

   **Caso D: .ECO corrupto**
   - [ ] Estado: 🔴 ROJO "Error"
   - [ ] Mensaje: "Formato inválido" o "Firma no válida"

6. **Verificar metadatos**
   - [ ] Nombre del documento
   - [ ] Algoritmo usado (SHA-256)
   - [ ] Timestamp forense
   - [ ] Información de anclaje blockchain (si aplica)

### Resultado esperado
✅ Verificación independiente sin depender de VerifySign

---

## Checklist Pre-Beta

### Infraestructura
- [ ] Supabase Auth configurado
- [ ] Buckets de Storage creados
- [ ] Edge Functions desplegadas
- [ ] Variables de entorno en producción
- [ ] RLS policies activas

### Funcionalidad
- [ ] Flujo 1: Certificar documento ✅
- [ ] Flujo 2: Compartir con NDA ✅
- [ ] Flujo 3: Verificar público ✅
- [ ] 61/61+ tests pasando
- [ ] Build exitoso sin errores

### UI/UX
- [ ] Landing page responsive
- [ ] Dashboard funcional
- [ ] Pricing claro
- [ ] Página "Cómo lo hacemos"
- [ ] Mensajes de error claros

### Seguridad
- [ ] CSRF tokens implementados
- [ ] Rate limiting activo
- [ ] File validation
- [ ] Input sanitization
- [ ] RLS en todas las tablas

---

## Reportar Bugs

Si encontrás errores durante las pruebas:

1. **Documentar**:
   - Flujo y paso donde ocurrió
   - Mensaje de error exacto
   - Screenshot si es visual
   - Console logs (F12 → Console)

2. **Priorizar**:
   - 🔴 Crítico: Bloquea flujo completo
   - 🟡 Alto: Funcionalidad parcial
   - 🟢 Bajo: Visual o mejora

3. **Formato**:
```
## Bug Report
**Flujo**: [1/2/3]
**Paso**: [número]
**Descripción**: [qué pasó]
**Esperado**: [qué debería pasar]
**Actual**: [qué pasó realmente]
**Logs**: [copiar errores]
```

---

*Última actualización: 2025-11-16*
*Autor: Manuel + Claude AI*
