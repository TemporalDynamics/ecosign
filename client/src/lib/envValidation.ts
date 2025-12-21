/**
 * Environment Variables Validation
 * Valida que todas las variables requeridas estén configuradas al inicio
 * Previene errores difíciles de debuggear en runtime
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_API_URL?: string;
}

class EnvValidationError extends Error {
  constructor(
    message: string,
    public missingVars: string[]
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validar que una variable esté definida y no vacía
 */
function validateVar(name: string, value: string | undefined): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  // Verificar que no sea placeholder
  if (value.startsWith('YOUR_') || value.includes('xxx') || value.includes('...')) {
    console.warn(`⚠️ Variable ${name} parece ser un placeholder`);
    return false;
  }

  return true;
}

/**
 * Validar formato de Supabase URL
 */
function validateSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isHosted = parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    const isLocalHost = ['localhost', '127.0.0.1'].includes(parsed.hostname) && ['http:', 'https:'].includes(parsed.protocol);
    return isHosted || isLocalHost;
  } catch {
    return false;
  }
}

/**
 * Validar formato de Supabase Anon Key (JWT)
 */
function validateSupabaseKey(key: string): boolean {
  // JWT tiene 3 partes separadas por '.'
  const parts = key.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Verificar que cada parte esté en base64
  return parts.every(part => /^[A-Za-z0-9_-]+$/.test(part));
}

/**
 * Validar todas las environment variables requeridas
 */
export function validateEnvironment(): EnvConfig {
  const missingVars: string[] = [];
  const errors: string[] = [];

  // Variables requeridas
  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Validar Supabase URL
  if (!validateVar('VITE_SUPABASE_URL', VITE_SUPABASE_URL)) {
    missingVars.push('VITE_SUPABASE_URL');
  } else if (!validateSupabaseUrl(VITE_SUPABASE_URL)) {
    errors.push('VITE_SUPABASE_URL tiene formato inválido (usa https://xxx.supabase.co o http://127.0.0.1:54321 en local)');
  }

  // Validar Supabase Anon Key
  if (!validateVar('VITE_SUPABASE_ANON_KEY', VITE_SUPABASE_ANON_KEY)) {
    missingVars.push('VITE_SUPABASE_ANON_KEY');
  } else if (!validateSupabaseKey(VITE_SUPABASE_ANON_KEY)) {
    errors.push('VITE_SUPABASE_ANON_KEY tiene formato inválido (debe ser un JWT)');
  }

  // Si hay errores, lanzar excepción
  if (missingVars.length > 0 || errors.length > 0) {
    const message = [
      '❌ ERROR: Variables de entorno faltantes o inválidas',
      '',
      ...(missingVars.length > 0 ? ['Faltantes:', ...missingVars.map(v => `  - ${v}`)] : []),
      ...(errors.length > 0 ? ['Errores:', ...errors.map(e => `  - ${e}`)] : []),
      '',
      '📝 Solución:',
      '  1. Copia client/.env.example → client/.env',
      '  2. Configura tus credenciales de Supabase',
      '  3. Reinicia el servidor de desarrollo',
      '',
      '🔗 Guía: https://github.com/your-org/verifysign/blob/main/client/README.md'
    ].join('\n');

    throw new EnvValidationError(message, missingVars);
  }

  // Variables opcionales
  const VITE_API_URL = import.meta.env.VITE_API_URL;

  // Log de confirmación (solo en desarrollo)
  if (import.meta.env.DEV) {
    console.log('✅ Environment variables validadas correctamente');
    console.log(`   Supabase URL: ${VITE_SUPABASE_URL}`);
    console.log(`   API URL: ${VITE_API_URL || '/.netlify/functions (default)'}`);
  }

  return {
    VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY,
    VITE_API_URL
  };
}

/**
 * Validar environment variables de forma segura
 * Retorna boolean en lugar de throw (para uso condicional)
 */
export function checkEnvironment(): boolean {
  try {
    validateEnvironment();
    return true;
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
    }
    return false;
  }
}

/**
 * Mostrar error visual de env vars en UI
 */
export function renderEnvErrorUI(): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>EcoSign - Configuration Error</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #fef3c7 0%, #fca5a5 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            padding: 40px;
            max-width: 600px;
            width: 100%;
          }
          .icon {
            width: 64px;
            height: 64px;
            background: #fca5a5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 32px;
          }
          h1 {
            color: #dc2626;
            font-size: 24px;
            margin-bottom: 12px;
            text-align: center;
          }
          p {
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .code {
            background: #f3f4f6;
            border-left: 4px solid #dc2626;
            padding: 16px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            overflow-x: auto;
            margin: 20px 0;
          }
          .steps {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .steps h2 {
            color: #15803d;
            font-size: 16px;
            margin-bottom: 12px;
          }
          .steps ol {
            margin-left: 20px;
            color: #4b5563;
          }
          .steps li {
            margin-bottom: 8px;
          }
          a {
            color: #0891b2;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Error de Configuración</h1>
          <p>
            EcoSign no pudo iniciar porque faltan variables de entorno requeridas.
            Verifica la consola del navegador para más detalles.
          </p>

          <div class="steps">
            <h2>📝 Pasos para solucionar:</h2>
            <ol>
              <li>Copia <code>client/.env.example</code> → <code>client/.env</code></li>
              <li>Configura tus credenciales de Supabase</li>
              <li>Reinicia el servidor (<code>npm run dev</code>)</li>
            </ol>
          </div>

          <div class="code">
# Ejemplo client/.env<br>
VITE_SUPABASE_URL=https://xxx.supabase.co<br>
VITE_SUPABASE_ANON_KEY=eyJhbGc...
          </div>

          <p style="text-align: center; margin-top: 24px;">
            <a href="https://github.com/your-org/verifysign/blob/main/LOCAL-DEV.md" target="_blank">
              Ver guía completa →
            </a>
          </p>
        </div>
      </body>
    </html>
  `;
}
