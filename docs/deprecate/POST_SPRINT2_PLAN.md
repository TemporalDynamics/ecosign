# 📋 Plan Post-Sprint 2

> **Fecha:** 2024-12-16  
> **Estado Actual:** Sprint 2 completado (Día 1, 2, 4)  
> **Siguiente fase:** Testing Manual + Preparación MVP

---

## ✅ Completado (Sprint 2)

### **Día 1: ESLint + Testing Infrastructure**
- ✅ ESLint configurado con reglas básicas
- ✅ Tests de seguridad funcionando con Supabase local
- ✅ 52 tests pasando
- ✅ CI/CD básico en GitHub Actions

### **Día 2: Documentation Core**
- ✅ RUNBOOK.md (operaciones)
- ✅ TRUST_BOUNDARIES.md (arquitectura de confianza)
- ✅ PERFORMANCE.md (guías de optimización)
- ✅ DEPENDENCIES.md (gestión de dependencias)
- ✅ Reorganización de docs (deprecated/)

### **Día 4: Legal MVP**
- ✅ TESTER_NDA.md
- ✅ PRIVACY_POLICY.md
- ✅ DATA_RETENTION.md

### **Día 3: Architecture (este commit)**
- ✅ ARCHITECTURE.md
- ✅ NOT_IMPLEMENTED.md

---

## 🎯 Siguiente Prioridad: Testing Manual

### **Objetivo**
Validar **TODA** la Fase 3 manualmente antes de invitar testers.

### **Checklist de Testing Manual**

#### **1. Centro Legal - Flujo Base**
- [ ] Cargar documento (PDF válido)
- [ ] Ver documento en el visor
- [ ] Cambiar documento
- [ ] Preview full-screen
- [ ] Volver al Centro Legal desde preview

#### **2. Mi Firma (F3.2)**
- [ ] Click en "Mi Firma" abre modal inmediatamente
- [ ] Dibujar firma con cursor alineado (NO offset)
- [ ] Firmar con teclado
- [ ] Subir imagen de firma
- [ ] Confirmar firma
- [ ] Ver firma aplicada en documento (visible, no solo toast)
- [ ] Opciones de tipo aparecen DESPUÉS de firmar
- [ ] Seleccionar "Firma Legal"
- [ ] Seleccionar "Firma Certificada"
- [ ] Intentar certificar SIN firma → toast abajo (error)

#### **3. NDA**
- [ ] Toggle NDA despliega panel izquierdo
- [ ] Panel izquierdo NO afecta firma
- [ ] Configurar NDA básico
- [ ] Visor permanece visible

#### **4. Flujo de Firmas (F3.2b - MVP)**
- [ ] Toggle "Flujo de Firmas" despliega panel derecho
- [ ] Panel derecho NO afecta "Mi Firma"
- [ ] Agregar 1 firmante → 1 campo visible en documento
- [ ] Agregar 3 firmantes → 3 campos visibles
- [ ] Campos están en última página (estándar)
- [ ] Campos NO se superponen

#### **5. Toolbar del Visor (F3.3)**
- [ ] Solo visible: Preview + Cambiar archivo
- [ ] NO visible: Resaltador, comentarios, texto, etc.
- [ ] Botones alineados (no en filas distintas)

#### **6. Descargas Coherentes (F3.3)**
- [ ] Si guardó documento → botón habilitado
- [ ] Si NO guardó → botón deshabilitado + mensaje claro
- [ ] Descargar .ECO funciona
- [ ] Descargar PDF cifrado funciona (si guardó)

#### **7. Guía / Mentor Ciego (F3.3)**
- [ ] Primer uso → mensaje discreto arriba derecha (NO modal)
- [ ] Mensaje NO bloquea UI
- [ ] Mensaje NO oscurece fondo
- [ ] Opción "Sí" → guía activa
- [ ] Opción "No" → sin guía
- [ ] Opción "No volver a mostrar" → nunca más
- [ ] Documento cargado → toast "somos ciegos" (si guía activa)
- [ ] Primera firma → toast sobrio
- [ ] Firma aplicada → toast confirmación
- [ ] Tipo de firma → descripción breve
- [ ] Antes de certificar → toast final

#### **8. Vista Documentos (Correcciones)**
- [ ] NO aparece subtítulo explicativo
- [ ] NO aparece leyenda de estados
- [ ] Solo badge por documento
- [ ] Badge dice "Certificado" o "Certificado Reforzado" (azul, 2 líneas)
- [ ] NO dice "Irrefutable"

---

## 🚨 Problemas Conocidos a Validar

1. **Cursor offset en firma** (debería estar corregido - validar en distintos navegadores)
2. **Mensaje bienvenida duplicado** (corregido - validar)
3. **Toast de error arriba** (debería estar abajo - validar)
4. **Toolbar confuso** (simplificado - validar)

---

## 📊 Criterios de Éxito (antes de testers)

### **Mínimos**
- ✅ Usuario puede firmar documento en <3 segundos
- ✅ Cursor de firma alineado
- ✅ Firma visible después de aplicar
- ✅ Flujo inequívoco (sin dudas)
- ✅ Mensajes claros (no confusos)
- ✅ Toasts en posición correcta

### **Deseables**
- ✅ Guía opcional funciona sin molestar
- ✅ Flujo de firmas muestra campos
- ✅ Preview vuelve al Centro Legal sin pérdida de contexto

---

## 🔄 Workflow Sugerido

1. **Testing manual completo** (este checklist)
2. **Grabar video** del flujo completo
3. **Documentar bugs** encontrados
4. **Fix crítico** (si hay)
5. **Re-test** flujo completo
6. **Merge a main** (si todo OK)
7. **Deploy a staging** (Vercel preview)
8. **Invitar 3 testers** de confianza

---

## 🛑 NO TOCAR (Recordatorio)

- ❌ KMS / Rotación de claves
- ❌ Migración masiva JS → TS
- ❌ Microservicios / Colas
- ❌ Load testing
- ❌ Cambios de UI sin validación
- ❌ WAF / DDoS avanzado
- ❌ Feature flags complejos

**Por qué:** Pre-optimización. Todas tienen triggers claros en `NOT_IMPLEMENTED.md`.

---

## 📅 Timeline Estimado

| Fase | Duración | Responsable |
|------|----------|-------------|
| Testing manual | 2-3 horas | Manu |
| Fixes críticos | 1-2 horas | Dev |
| Re-test | 1 hora | Manu |
| Deploy staging | 15 min | Auto |
| Invitar testers | 1 día | Manu |
| Recopilar feedback | 3-5 días | Testers |
| Ajustes finales | 1-2 días | Dev |
| **MVP Privado listo** | **~1 semana** | Equipo |

---

## 🎯 Objetivo Final

**Un MVP que:**
- ✅ Funciona sin bugs críticos
- ✅ Es inequívoco (usuario no se confunde)
- ✅ Es profesional (no parece roto)
- ✅ Está documentado (legal + técnico)
- ✅ Está listo para feedback real

**NO necesita:**
- ❌ Ser perfecto
- ❌ Escalar a 10k usuarios
- ❌ Tener todas las features
- ❌ Ser visualmente impecable

---

## 📝 Notas del PM

> "El MVP es para aprender, no para vender.  
> Si aprendemos con 10 testers, ya ganamos.  
> Si escalamos sin aprender, ya perdimos."

La calidad que importa ahora es:
1. **Funcional** (no se rompe)
2. **Claro** (no confunde)
3. **Coherente** (narrativa sólida)

Todo lo demás es optimización prematura.

---

**Próxima revisión:** Post-testing manual  
**Última actualización:** Sprint 2 Día 3
