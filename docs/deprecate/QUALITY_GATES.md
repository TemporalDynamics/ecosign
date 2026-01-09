# 🛡️ Quality Gates — EcoSign

## 📋 Resumen

Este documento describe los **gates de calidad obligatorios** que debe pasar el código antes de ser mergeado a `main`.

---

## 🎯 Gates Obligatorios

### 1. **Lint** (ESLint)
```bash
npm run lint
```

**Qué verifica:**
- Errores de sintaxis
- Uso de variables sin declarar
- Imports rotos
- Código React con bugs potenciales (hooks, JSX, etc.)
- console.log (solo permite console.warn y console.error)

**Resultado esperado:** ✅ 0 errores, 0 warnings

---

### 2. **Typecheck** (TypeScript)
```bash
npm run typecheck
```

**Qué verifica:**
- Errores de tipos en archivos .jsx y .tsx
- Propiedades no definidas
- Funciones llamadas con argumentos incorrectos

**Resultado esperado:** ✅ 0 errores

---

### 3. **Tests** (Vitest)
```bash
npm run test
```

**Qué verifica:**
- Tests unitarios
- Tests de seguridad (XSS, SQL injection, etc.)
- Funcionalidad crítica

**Resultado esperado:** ✅ Todos los tests pasan

---

### 4. **Build** (Vite)
```bash
npm run build
```

**Qué verifica:**
- El proyecto compila sin errores
- No hay imports circulares
- El bundle se genera correctamente

**Resultado esperado:** ✅ Build exitoso

---

## ⚡ Validación Completa

Para correr **todos los gates** de una sola vez:

```bash
npm run validate
```

Este comando ejecuta en secuencia:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`

**Si alguno falla, el proceso se detiene.**

---

## 🔧 Auto-fix

Algunos errores se pueden arreglar automáticamente:

```bash
npm run lint:fix
```

Esto arregla:
- Formato de código
- Imports sin usar
- Variables declaradas como `var` → `const`/`let`
- Espaciado inconsistente

---

## 📂 Estructura del Proyecto

```
ecosign/
├── client/              # React app (donde está el código principal)
│   ├── src/
│   ├── eslint.config.js # Configuración de ESLint
│   ├── tsconfig.json    # Configuración de TypeScript
│   └── package.json
├── eco-packer/          # Librería ECO/ECOX
├── tests/               # Tests de seguridad y unitarios
└── package.json         # Scripts globales
```

---

## 🚨 Errores Comunes

### 1. **"React is defined but never used"**
- **Causa:** React 18 usa JSX transform automático
- **Fix:** Remover `import React from 'react'` de archivos .jsx

### 2. **"process is not defined"**
- **Causa:** ESLint no reconoce globales de Node.js en scripts
- **Fix:** Agregar `/* eslint-env node */` al inicio del archivo

### 3. **"Unexpected token ?"**
- **Causa:** Optional chaining (`?.`) en versión vieja de parser
- **Fix:** Actualizar parser de ESLint

### 4. **"Missing import" (iconos de lucide-react)**
- **Causa:** Icono usado pero no importado
- **Fix:** Agregar import: `import { IconName } from 'lucide-react'`

---

## 📊 Estado Actual

**Última auditoría:** 2025-12-13

### Resumen de Issues Encontrados:

| Categoría | Errores | Warnings |
|-----------|---------|----------|
| **Lint** | ~15 | ~40 |
| **Typecheck** | TBD | TBD |
| **Tests** | 0 | 0 |
| **Build** | TBD | TBD |

---

## 🎯 Próximos Pasos

### Día 3: Dead Code Audit
- Instalar y correr `knip`
- Detectar archivos no usados
- Detectar exports muertos
- Detectar rutas huérfanas

### Día 4: React Lifecycle Audit
- StrictMode double-render issues
- `createObjectURL` sin `revokeObjectURL`
- `useEffect` con dependencias incorrectas
- JSX duplicado o inválido

### Día 5: PRs de Fixes
- Fix de imports rotos (P0)
- Fix de JSX inválido (P0)
- Limpieza de variables sin usar (P1)
- Limpieza de console.log (P2)

---

## 💡 Filosofía

> **"Nada entra si no pasa por acá"**

Los quality gates no son opcionales. Son el **gatekeeper** que previene:
- Bugs en producción
- Código muerto que se acumula
- Imports rotos que causan crashes
- Regresiones silenciosas

**Si falla un gate → el código no se mergea.**

---

## 🔗 Links Útiles

- [ESLint Docs](https://eslint.org/docs/latest/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Vitest Docs](https://vitest.dev/)
- [React ESLint Plugin](https://github.com/jsx-eslint/eslint-plugin-react)

---

**Última actualización:** 2025-12-13
**Mantenido por:** Arquitecto de Calidad
