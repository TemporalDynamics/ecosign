# Protocolo de Migración de Decisiones - Fase 2

**Versión:** v1.0  
**Fecha:** 2026-01-21  
**Estado:** ACTIVO

---

## 🎯 Objetivo del Protocolo

Migrar decisiones del executor al runtime canónico de forma controlada, con validación inmediata de UI después de cada cambio.

**No se avanza a la siguiente decisión hasta que la UI esté validada.**

---

## 📋 Regla Fundamental (No Negociable)

> **Después de mover UNA decisión, se detiene el desarrollo y se valida la UI.**  
> **No se mueven dos decisiones sin haber visto la UI reaccionar correctamente.**

---

## 🧠 Qué es "Mover una Decisión"

**Mover una decisión** = pasar la lógica de decisión desde:
- `executor` (Supabase Edge Function) 
- → `contracts-runtime.decideNextJobs()` (función pura)

**Ejemplos de decisiones:**
- "cuándo se encola `run_tsa`"
- "cuándo se considera 'protegido'"
- "cuándo se habilita descarga"
- "cuándo termina un flujo"

---

## 🐜 Protocolo Exacto por Cada Decisión

### 1️⃣ Paso Técnico (Dev)

El dev SOLO hace esto:

1. Implementa la regla en `contracts-runtime`
2. Integra esa regla en modo shadow o controlado
3. Registra:
   - Decisión tomada
   - Razón
   - Decisor (executor o orchestrator)

❌ **No toca UI**  
❌ **No migra otra decisión**  
❌ **No aprovecha para refactorizar**

### 2️⃣ Pausa Obligatoria (Clave)

**Se frena todo. No se sigue migrando.**

### 3️⃣ Validación en UI (Equipo)

Se abre la app y se recorren todos los flujos afectados por esa decisión.

**Checklist mínima (ejemplo TSA-only):**
- Subir documento
- Ver estado inicial correcto
- Iniciar protección
- Ver "pendiente TSA"
- Confirmar que:
  - El estado cambia SOLO cuando llega el evento
  - No hay flickers
  - No hay estados imposibles
  - No aparece nada "por anticipado"

📌 **La UI debe estar usando:**
- `deriveUiState(events)`  
- No columnas sueltas

### 4️⃣ Resultado Binario (No Opinable)

**Solo hay 2 estados posibles:**

✅ **ACEPTADO**
- La UI refleja exactamente lo esperado
- No hay divergencias
- La decisión puede considerarse "migrada"
- → Se habilita mover la siguiente decisión

❌ **RECHAZADO**
- La UI muestra algo incorrecto
- El estado aparece antes o después
- Hay ambigüedad visual
- → Se revierte o corrige
- → NO se avanza de fase

### 5️⃣ Autoridad de Aprobación (Regla No Negociable)

**Una decisión migrada NO se considera validada cuando:**
- El dev afirma que "la UI refleja correctamente"
- Existen logs correctos
- El comportamiento parece correcto en código

**Una decisión migrada SOLO se considera ACEPTADA cuando:**
- El responsable de validación (arquitecto / owner del sistema)
- Ejecuta el flujo completo en su entorno local
- Observa manualmente la UI
- Confirma explícitamente el estado **ACEPTADO**

**Hasta ese momento:**
- El dev debe detener el avance
- No puede migrar la siguiente decisión
- No puede asumir validación implícita

---

## 🔄 Qué Espera el Dev Después de Mover una Decisión

**Después de mover una decisión, no continúes.**

**Espera a que validemos manualmente TODOS los flujos UI que dependen de esa decisión.**

**Recién cuando la UI refleje correctamente el nuevo modelo, se habilita el siguiente paso.**

**Eso es parte del sprint, no un freno.**

---

## 📅 Orden Recomendado de Decisiones

Para evitar problemas, seguir este orden:

### 1️⃣ TSA-only
- Cuándo se encola `run_tsa`
- Cuándo se considera confirmado

### 2️⃣ Finalización simple  
- Cuándo aparece "listo / protegido"

### 3️⃣ Artifact final
- Cuándo se habilita descarga

### 4️⃣ Recién después:
- Polygon
- Bitcoin  
- Firma
- Flujos complejos

---

## 💬 Frase Clave para el Dev

> **"No estamos optimizando velocidad. Estamos validando que el sistema sea legible y determinista. La UI es nuestro osciloscopio."**

---

## 🎯 Estado Actual vs Próximo Objetivo

### Esto sigue siendo **Fase 2**
- La UI todavía no es canónica
- La UI es un verificador de verdad

### **Fase 3 empieza cuando:**
- El orquestador decide todo
- La UI ya no sorprende nunca

---

## ✅ Checklist de Validación por Decisión

Antes de avanzar a la siguiente decisión, verificar:

- [ ] Decisión implementada en contracts-runtime
- [ ] Modo shadow/controlado activo
- [ ] UI refleja correctamente el cambio
- [ ] No hay estados imposibles
- [ ] No hay flickers ni anticipaciones
- [ ] Solo eventos canónicos determinan UI
- [ ] Equipo aprueba validación manual

---

**Importante:** Este protocolo garantiza que cada paso sea sólido antes de avanzar. No es una limitación, es una garantía de calidad.