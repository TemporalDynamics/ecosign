# Templates de Email para EcoSign

Templates HTML para emails transaccionales de Supabase Auth.

## 📋 **Templates disponibles**

### 1. `confirm_email_template.html`
**Cuándo se envía:** Cuando un usuario se registra por primera vez.  
**Propósito:** Confirmar dirección de email.

**Variables de Supabase:**
- `{{ .ConfirmationURL }}` - URL de confirmación generada automáticamente

**Asunto recomendado:**
```
Confirmá tu email para comenzar con EcoSign
```

---

### 2. `reset_password_template.html`
**Cuándo se envía:** Cuando un usuario solicita restablecer su contraseña.  
**Propósito:** Permitir cambio de contraseña de forma segura.

**Variables de Supabase:**
- `{{ .ConfirmationURL }}` - URL de reset generada automáticamente

**Asunto recomendado:**
```
Restablecer tu contraseña de EcoSign
```

**Características de seguridad:**
- ✅ Advertencia clara si NO solicitó el cambio
- ✅ Mención de expiración (1 hora)
- ✅ Banner amarillo con alerta visual
- ✅ Tono serio pero no alarmista

---

### 3. `welcome_founder_template.html`
**Cuándo se envía:** Después de que el usuario confirma su email (manual o automático).  
**Propósito:** Dar bienvenida y explicar beneficio Founder.

**Variables customizadas:**
- `{{ .FounderNumber }}` - Número de founder (ej: 9, 10, 11...)
- `{{ .UserName }}` - Nombre del usuario
- `{{ .Email }}` - Email del usuario

---

## 🚀 **Cómo aplicar en Supabase**

### **Template 1: Email de Confirmación**

1. Andá a **Supabase Dashboard** → Tu proyecto
2. **Authentication** (menú izquierdo)
3. **Email Templates**
4. Seleccioná **Confirm signup**
5. Copiá el contenido de `confirm_email_template.html`
6. Pegalo en el editor
7. **Asunto del email:** `Confirmá tu email para comenzar con EcoSign`
8. **Save**

---

### **Template 2: Reset Password**

1. Andá a **Supabase Dashboard** → Tu proyecto
2. **Authentication** (menú izquierdo)
3. **Email Templates**
4. Seleccioná **Reset password**
5. Copiá el contenido de `reset_password_template.html`
6. Pegalo en el editor
7. **Asunto del email:** `Restablecer tu contraseña de EcoSign`
8. **Save**

---

### **Template 3: Email de Bienvenida (Founder)**

Este email NO lo maneja Supabase automáticamente. Tenés dos opciones:

#### **Opción A: Trigger de base de datos** (Recomendado)

Crear un trigger que envíe el email cuando `email_confirmed_at` cambia:

```sql
-- Function para enviar email de bienvenida
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  founder_number INTEGER;
BEGIN
  -- Contar usuarios confirmados para asignar número Founder
  SELECT COUNT(*) + 1 INTO founder_number
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL;
  
  -- Aquí iría la lógica para enviar el email
  -- (puedes usar una Edge Function de Supabase o un servicio externo)
  
  RETURN NEW;
END;
$$;

-- Trigger cuando se confirma email
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.send_welcome_email();
```

#### **Opción B: Edge Function** (Más flexible)

Crear una Edge Function que escuche el evento `user.confirmed` y envíe el email.

---

## 🎨 **Características del diseño**

✅ **Estilo EcoSign:**
- Bordes redondeados (12px principales, 8px secundarios)
- CTA negro con texto blanco
- Tipografía system fonts (-apple-system, Segoe UI)
- Sin "Dashboard" (solo "EcoSign")

✅ **Responsive:**
- Max-width 600px
- Funciona en todos los clientes de email

✅ **Compatible con:**
- Gmail
- Outlook
- Apple Mail
- Clientes móviles

---

## 📝 **Personalización**

### **Cambiar colores:**

```css
/* CTA Button */
background-color: #000000; /* Negro */
color: #ffffff;            /* Blanco */

/* Links */
color: #3b82f6;            /* Azul */

/* Badge Founder */
border: 2px solid #000000; /* Borde negro */
```

### **Cambiar textos:**

Todos los textos están en español y son editables directamente en el HTML.

---

## ⚠️ **Importante**

- NO usar `<style>` tags (algunos clientes los filtran)
- Todos los estilos están inline
- Las tablas se usan para layout (estándar en emails HTML)
- Las URLs deben ser absolutas (`https://www.ecosign.app`)

---

## 🧪 **Testing**

Antes de aplicar en producción:

1. Enviate un test email desde Supabase
2. Verificá en:
   - Gmail (web + mobile)
   - Outlook
   - Apple Mail
3. Confirmá que los links funcionan
4. Verificá que las variables se reemplazan correctamente

---

## 📦 **Archivos**

```
emails/
├── confirm_email_template.html      # Confirmación de email
├── reset_password_template.html     # Reset de contraseña
├── welcome_founder_template.html    # Bienvenida Founder
└── README.md                        # Esta documentación
```

---

**Cualquier duda:** soporte@ecosign.app
