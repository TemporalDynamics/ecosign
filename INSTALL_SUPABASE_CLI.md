# Instalar Supabase CLI en Linux

## ❌ Por qué `npm install -g supabase` no funciona

Supabase CLI ya no se distribuye vía npm. Desde 2024 solo se distribuye como binario compilado.

Ver: https://github.com/supabase/cli#install-the-cli

---

## ✅ MÉTODO 1: Script Automático (Recomendado)

```bash
./scripts/install-supabase-cli.sh
```

Este script:
1. Detecta tu arquitectura (x86_64 / arm64)
2. Descarga la última versión desde GitHub
3. Instala en `/usr/local/bin/supabase`
4. Verifica la instalación

---

## ✅ MÉTODO 2: Manual (Paso a Paso)

### Paso 1: Descargar

```bash
cd /tmp

# Para x86_64 (la mayoría de sistemas):
curl -L -o supabase.tar.gz \
  https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz

# Para ARM64 (Raspberry Pi, etc.):
# curl -L -o supabase.tar.gz \
#   https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.tar.gz
```

### Paso 2: Extraer

```bash
tar -xzf supabase.tar.gz
```

### Paso 3: Instalar

```bash
sudo mv supabase /usr/local/bin/supabase
sudo chmod +x /usr/local/bin/supabase
```

### Paso 4: Verificar

```bash
supabase --version
```

Deberías ver algo como:
```
1.207.7
```

### Paso 5: Limpiar

```bash
rm /tmp/supabase.tar.gz
```

---

## ✅ MÉTODO 3: Usando Homebrew (alternativa)

Si tienes Homebrew en Linux:

```bash
brew install supabase/tap/supabase
```

---

## 🚀 Después de Instalar

### 1. Login

```bash
supabase login
```

Se abrirá tu navegador para autenticarte. Si no se abre:
1. Ve a: https://supabase.com/dashboard/account/tokens
2. Crea un nuevo access token
3. Pégalo en la terminal

### 2. Link al Proyecto

```bash
supabase link --project-ref uiyojopjbhooxrmamaiw
```

Te pedirá la contraseña de tu proyecto:
1. Ve a: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/settings/database
2. Copia la contraseña de la base de datos
3. Pégala en la terminal

### 3. Desplegar Funciones

```bash
./scripts/deploy-functions.sh
```

O manualmente:

```bash
supabase functions deploy anchor-bitcoin
supabase functions deploy signnow
supabase functions deploy process-bitcoin-anchors
```

---

## 🐛 Troubleshooting

### "supabase: command not found" después de instalar

Agrega `/usr/local/bin` a tu PATH:

```bash
# Temporalmente (solo esta sesión):
export PATH="/usr/local/bin:$PATH"

# Permanentemente:
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### "Permission denied" al instalar

Necesitas sudo:

```bash
sudo mv supabase /usr/local/bin/supabase
```

### Quiero instalarlo sin sudo (en mi home)

```bash
# Crear directorio para binarios locales
mkdir -p ~/.local/bin

# Mover supabase ahí
mv supabase ~/.local/bin/supabase
chmod +x ~/.local/bin/supabase

# Agregar a PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

---

## 📋 Verificación Final

```bash
which supabase
# Debería mostrar: /usr/local/bin/supabase

supabase --version
# Debería mostrar: 1.207.x o superior

supabase projects list
# Debería mostrar tus proyectos (después de login)
```

---

## 🔗 Referencias

- Repositorio oficial: https://github.com/supabase/cli
- Releases: https://github.com/supabase/cli/releases
- Documentación: https://supabase.com/docs/guides/cli
