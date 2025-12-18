# Backend (Supabase)

Este directorio contiene toda la configuración y los activos del backend de Ecosign, gestionado por Supabase.

- `/functions`: Contiene las Edge Functions (Deno) que ejecutan lógica del lado del servidor.
- `/migrations`: Contiene las migraciones incrementales del esquema de la base de datos PostgreSQL.
- `config.toml`: Archivo principal de configuración del proyecto Supabase.
- `SETUP.md`: Guía de configuración inicial.

## 🚀 Desarrollo Local

Para trabajar en el backend, es necesario tener la [Supabase CLI](https://supabase.com/docs/guides/cli) instalada.

### 1. Iniciar el Stack de Supabase

Para levantar el contenedor de Docker con la base de datos, Auth, Storage y las funciones, ejecuta:
```bash
supabase start
```
Una vez iniciado, la CLI mostrará las URLs locales de la API, la URL de Supabase Studio y las claves (`anon_key`, `service_role_key`) para configurar el cliente.

### 2. Estado de los Servicios

Para verificar que todo funciona correctamente y volver a ver las URLs y claves:
```bash
supabase status
```

## 🗃️ Migraciones de Base de Datos

Las migraciones nos permiten versionar los cambios en el esquema de la base de datos.

- **Crear una nueva migración:**
  ```bash
  # Después de hacer cambios en tu BD local con Supabase Studio...
  supabase migration new <nombre_descriptivo_de_la_migracion>
  ```

- **Aplicar migraciones al entorno local:**
  Para resetear la base de datos local y aplicar todas las migraciones desde cero:
  ```bash
  supabase db reset
  ```

##  EDGE FUNCTIONS

Las Edge Functions se encuentran en `/functions` y se pueden probar localmente.

- **Servir funciones localmente:**
  ```bash
  # Este comando se ejecuta automáticamente con 'supabase start'
  supabase functions serve
  ```

- **Desplegar una función:**
  Para desplegar o actualizar una función en el entorno de Supabase Cloud:
  ```bash
  supabase functions deploy <nombre_de_la_funcion>
  ```
