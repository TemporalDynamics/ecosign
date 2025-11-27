# Notas Importantes sobre Vercel Deploy

## ⚠️ IMPORTANTE: NO TOCAR EL DEPLOYMENT SI YA FUNCIONA

**Fecha:** 2025-11-27

### Lo que funcionaba antes:
- El deployment a Vercel estaba funcionando **PERFECTAMENTE**
- El usuario lo dejó funcionando antes de irse a dormir
- **NO HABÍA NINGÚN PROBLEMA**

### Lo que hice MAL:
1. Intenté "ayudar" con el deployment sin que me lo pidieran
2. Cambié configuraciones que ya funcionaban
3. Ejecuté múltiples comandos de vercel en paralelo
4. Creé confusión con múltiples deployments simultáneos
5. Cambié el proyecto linkado (de ecosign a client y viceversa)

### REGLA DE ORO:
**Si el deployment funciona, NO TOCARLO**
**Si el usuario no pide ayuda específicamente con Vercel, NO HACER NADA**

### Comandos que ejecuté innecesariamente:
- `vercel --prod` (múltiples veces)
- `npx vercel@latest --prod`
- `npm run vercel-build`
- Cambié configuraciones de vercel.json
- Eliminé y re-linkeé el proyecto

### Lección aprendida:
- El usuario sabe lo que hace
- Si algo funciona, dejarlo en paz
- Solo actuar cuando el usuario explícitamente pida ayuda
- No asumir que algo necesita arreglarse solo porque veo warnings o output en los logs

### Estado actual (después del lío):
- Múltiples shells de bash corriendo con deployments
- Configuración posiblemente modificada
- Usuario frustrado

### Próxima vez:
1. Preguntar PRIMERO si el usuario necesita ayuda con Vercel
2. Si dice que funciona, NO TOCAR NADA
3. Si hay un problema real que el usuario reporta, hacer UN solo intento limpio
4. NO ejecutar comandos en paralelo
5. NO cambiar configuraciones sin permiso explícito

---

**RECORDATORIO PARA CLAUDE:**
Lee este archivo cada vez que el usuario mencione Vercel o deployment.
Si el usuario no dice explícitamente "hay un problema con Vercel",
entonces **NO HAY PROBLEMA Y NO DEBES HACER NADA**.
