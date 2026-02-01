# 🔄 INSTRUCCIONES DE ROLLBACK

**Última versión estable guardada**: `v0.2.0-eco-certification`
**Fecha**: 2025-11-11
**Commit**: `bbce739`

---

## ✅ PUNTO DE RETORNO CREADO

Acabamos de crear un **tag de Git** que marca este punto como estable. Si algo sale mal en el futuro, puedes volver aquí fácilmente.

---

## 🎯 ¿CUÁNDO USAR ROLLBACK?

Usa rollback si:
- ❌ Una nueva feature rompe el build
- ❌ Hay bugs críticos que no se pueden arreglar rápido
- ❌ Necesitas volver a una versión funcionando
- ❌ Experimentos que no funcionaron

**NO uses rollback si**:
- ✅ Solo hay warnings menores
- ✅ Puedes arreglar el bug con un fix rápido
- ✅ Solo quieres ver código anterior (usa `git show` en su lugar)

---

## 🔄 OPCIÓN 1: ROLLBACK COMPLETO (DESTRUCTIVO)

**⚠️ ADVERTENCIA**: Esto BORRA todos los cambios después de v0.2.0-eco-certification

```bash
# Ver el historial de tags
git tag -l

# Volver al punto de retorno (DESTRUCTIVO)
git reset --hard v0.2.0-eco-certification

# Si ya hiciste push de cambios malos, forzar el reset en GitHub
git push origin main --force

# Reconstruir
cd client
npm run build
```

**Cuándo usar**: Solo cuando quieres ELIMINAR todo después de este punto.

---

## 🔄 OPCIÓN 2: CREAR NUEVA RAMA DESDE EL TAG (SEGURO)

**✅ RECOMENDADO**: Mantiene el historial intacto

```bash
# Ver tags disponibles
git tag -l

# Crear nueva rama desde el punto de retorno
git checkout -b rollback-to-certification v0.2.0-eco-certification

# Ahora estás en una nueva rama con el código del tag
# Puedes trabajar aquí sin afectar main

# Cuando estés listo, puedes mergear o reemplazar main
git checkout main
git merge rollback-to-certification
```

**Cuándo usar**: Cuando quieres probar volver al punto anterior sin perder trabajo.

---

## 🔄 OPCIÓN 3: REVERTIR COMMITS ESPECÍFICOS (QUIRÚRGICO)

**✅ MÁS SEGURO**: Solo revierte commits específicos

```bash
# Ver historial de commits
git log --oneline

# Revertir un commit específico (crea nuevo commit que deshace cambios)
git revert <commit-hash>

# Ejemplo: Revertir el último commit
git revert HEAD

# Push del revert
git push origin main
```

**Cuándo usar**: Cuando solo quieres deshacer UN cambio específico.

---

## 🔍 OPCIÓN 4: VER CÓDIGO SIN CAMBIAR NADA

**✅ SOLO LECTURA**: No cambia nada

```bash
# Ver el código de un archivo en el tag
git show v0.2.0-eco-certification:client/src/pages/DashboardPage.jsx

# Ver todos los archivos del tag
git checkout v0.2.0-eco-certification -- .

# Volver a la versión actual
git checkout main -- .
```

**Cuándo usar**: Solo quieres ver cómo era el código antes.

---

## 📊 VERIFICAR DÓNDE ESTÁS

```bash
# Ver tag actual
git describe --tags

# Ver último commit
git log -1 --oneline

# Ver rama actual
git branch

# Ver diferencias entre tu código y el tag
git diff v0.2.0-eco-certification
```

---

## 🎯 HISTORIAL DE TAGS

```bash
# Listar todos los tags
git tag -l

# Ver info de un tag específico
git show v0.2.0-eco-certification

# Ver qué tags contienen un commit
git tag --contains <commit-hash>
```

---

## 🚨 EN CASO DE EMERGENCIA

Si algo salió mal y necesitas volver URGENTEMENTE:

```bash
# 1. Verificar que el tag existe
git tag -l | grep v0.2.0-eco-certification

# 2. Volver al tag (DESTRUCTIVO)
git reset --hard v0.2.0-eco-certification

# 3. Reconstruir
cd client
npm install
npm run build

# 4. Si ya hiciste push, forzar
git push origin main --force

# 5. Verificar que todo funciona
npm run dev
```

---

## 📝 CONTENIDO DEL TAG v0.2.0-eco-certification

**Incluye**:
- ✅ Certificación .ecox básica funcionando
- ✅ BasicCertificationService completo
- ✅ UI integrada en Dashboard
- ✅ Hash SHA-256 + Firma Ed25519
- ✅ Descarga automática de .ecox
- ✅ Tests pasando
- ✅ Build exitoso
- ✅ Documentación completa:
  - INSTALACION-ECO-PACKER-COMPLETA.md
  - CERTIFICACION-BASICA-FUNCIONANDO.md
  - ANALISIS-VALOR-MERCADO-ECO.md
  - FIX-LOGIN-COMPLETO.md

**NO incluye** (futuras features):
- ❌ OpenTimestamps (blockchain anchoring)
- ❌ RFC 3161 (TSA)
- ❌ Verificación de .ecox
- ❌ Almacenamiento en Supabase
- ❌ Key management avanzado

---

## 🎯 CREAR NUEVOS TAGS (FUTUROS)

Cuando implementes nuevas features importantes, crea tags adicionales:

```bash
# Después de implementar OpenTimestamps
git tag -a v0.3.0-opentimestamps -m "✅ OpenTimestamps implementado"
git push origin v0.3.0-opentimestamps

# Después de implementar RFC 3161
git tag -a v0.4.0-rfc3161 -m "✅ RFC 3161 TSA implementado"
git push origin v0.4.0-rfc3161

# Después de implementar verificación
git tag -a v0.5.0-verification -m "✅ Verificación de .ecox implementada"
git push origin v0.5.0-verification
```

---

## 📞 AYUDA RÁPIDA

| Quiero... | Comando |
|-----------|---------|
| Ver tags | `git tag -l` |
| Volver atrás (DESTRUCTIVO) | `git reset --hard v0.2.0-eco-certification` |
| Crear rama desde tag | `git checkout -b nueva-rama v0.2.0-eco-certification` |
| Ver código del tag | `git show v0.2.0-eco-certification:ruta/archivo` |
| Revertir último commit | `git revert HEAD` |
| Ver dónde estoy | `git describe --tags` |

---

## ✅ CONFIRMACIÓN

El punto de retorno está guardado en:
- 🏷️ Tag: `v0.2.0-eco-certification`
- 📦 Commit: `bbce739`
- 🌐 GitHub: Subido exitosamente
- 📁 Local: Disponible en tu repo

**Puedes continuar desarrollando con confianza.** Si algo sale mal, siempre puedes volver aquí.

---

**Última actualización**: 2025-11-11
**Creado por**: Claude Code
