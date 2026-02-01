# 🎥 Guía de Verificación y Corrección - Videos en Supabase

## Problema Reportado
1. ✅ **Espaciado del footer** - RESUELTO
2. ❌ **Videos no se reproducen** - EN PROCESO

---

## ✅ Corrección del Footer - COMPLETADA

### Cambio realizado:
Simplificado los botones de video para que tengan exactamente las mismas clases que los links normales.

**Antes:**
```jsx
<button onClick={() => playVideo('anatomia-firma')} 
  className="hover:text-[#0E4B8B] hover:underline transition text-left w-full p-0">
```

**Después:**
```jsx
<button onClick={() => playVideo('anatomia-firma')} 
  className="hover:text-[#0E4B8B] hover:underline transition">
```

**Resultado:** Los botones ahora tienen el mismo espaciado que los links de otras secciones.

---

## 🎥 Problema de Videos - Diagnóstico

### Posibles causas:

1. **Nombres de archivo incorrectos en el código**
2. **Espacios en nombres de archivo sin codificar**
3. **Archivos con nombres diferentes en Supabase**
4. **Permisos del bucket no públicos**

---

## 🔍 Paso 1: Verificar Nombres de Archivo en Supabase

1. **Ir a Supabase Dashboard**
   ```
   https://app.supabase.com
   ```

2. **Navegar a Storage > public-videos**

3. **Anotar los nombres EXACTOS de los archivos:**
   - ¿Tienen espacios?
   - ¿Tienen guiones?
   - ¿Mayúsculas/minúsculas?

---

## 📝 Nombres de Archivo Actuales en el Código

El código actual espera estos nombres:

```
1. Trust no need.mp4          → "You Don't Need to Trust"
2. Anatomiafirma.mp4          → "Anatomía de una Firma"
3. Verificable.mp4            → "Verdad Verificable"
4. ConocimientoCero.mp4       → "Conocimiento Cero"
5. EcoSign TrueCost.mp4       → "The True Cost"
6. Forensic_Integrity.mp4     → "Forensic Integrity"
```

**URLs codificadas:**
```
${SUPABASE_URL}/Trust%20no%20need.mp4
${SUPABASE_URL}/Anatomiafirma.mp4
${SUPABASE_URL}/Verificable.mp4
${SUPABASE_URL}/ConocimientoCero.mp4
${SUPABASE_URL}/EcoSign%20TrueCost.mp4
${SUPABASE_URL}/Forensic_Integrity.mp4
```

---

## 🔧 Solución 1: Renombrar en Supabase (Recomendado)

**Renombrar los archivos en Supabase para que coincidan con el código:**

```
1. Trust no need.mp4
2. Anatomiafirma.mp4
3. Verificable.mp4
4. ConocimientoCero.mp4
5. EcoSign TrueCost.mp4
6. Forensic_Integrity.mp4
```

✅ **Ventaja:** No requiere cambios en el código.

---

## 🔧 Solución 2: Actualizar el Código

Si los nombres en Supabase son diferentes, dame los nombres EXACTOS y actualizaré el código.

**Ejemplo:**
Si en Supabase el archivo se llama `trust-no-need.mp4`, actualizaría:

```javascript
'you-dont-need-to-trust': {
  src: `${SUPABASE_STORAGE_URL}/trust-no-need.mp4`,
  // ...
}
```

---

## 🧪 Paso 2: Probar las URLs Directamente

1. **Abrir una ventana del navegador**

2. **Pegar la URL completa del video:**
   ```
   https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/public-videos/Anatomiafirma.mp4
   ```

3. **¿Qué sucede?**
   - ✅ Se descarga/reproduce → El archivo existe
   - ❌ Error 404 → El nombre es incorrecto
   - ❌ Error 403 → Problema de permisos

---

## 🔒 Paso 3: Verificar Permisos del Bucket

1. **Ir a Storage > public-videos > Configuration**

2. **Verificar que sea público:**
   - [x] Public bucket
   - Allowed MIME types: `video/mp4`

3. **Policies:**
   ```sql
   -- Debería existir una policy de SELECT pública
   CREATE POLICY "Public videos are viewable by everyone"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'public-videos');
   ```

---

## 📋 Checklist de Verificación

### A verificar:
- [ ] Nombres exactos de archivos en Supabase
- [ ] URLs funcionan en navegador (probar directamente)
- [ ] Bucket está configurado como público
- [ ] Policies permiten acceso público (SELECT)
- [ ] MIME types incluyen `video/mp4`

---

## 🎯 Qué Necesito de Ti

**Por favor, proporcióname:**

1. **Lista de nombres de archivo EXACTOS desde Supabase:**
   ```
   Ej: 
   - trust_no_need.mp4
   - anatomia_firma.mp4
   - etc.
   ```

2. **Prueba de URL:**
   ```
   ¿Esta URL funciona en tu navegador?
   https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/public-videos/Anatomiafirma.mp4
   ```

3. **Error específico (si hay):**
   - ¿Qué dice la consola del navegador? (F12)
   - ¿Aparece algún mensaje de error?

---

## 🚀 Una Vez que Tenga esta Info

Actualizaré los nombres de archivo en `VideoPlayerContext.jsx` para que coincidan exactamente con los que tienes en Supabase.

---

**Estado Actual:**
- ✅ Footer corregido
- 🔍 Esperando info de nombres de archivo para corregir videos
