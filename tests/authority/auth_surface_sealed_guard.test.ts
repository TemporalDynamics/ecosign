import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const AUTH_SURFACE_DOC = path.join(ROOT, 'docs/beta/AUTH_SURFACE_SEALED.md');
const PREBETA_FIRE_DRILL_FILE = path.join(ROOT, 'scripts/diagnostics/prebeta_fire_drill.sh');
const CONFIG_FILE = path.join(ROOT, 'supabase/config.toml');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

// Matriz de autenticación por categoría
const AUTH_CATEGORIES = {
  // Categoría 1: Usuario Logueado (auth.getUser)
  userLogged: [
    'cancel-workflow',
    'claim-signer-package',
    'create-custody-upload-url',
    'create-invite',
    'create-signer-link',
    'generate-link',
    'get-eco',
    'get-signer-package-owner',
    'get-signed-url',
    'reissue-signer-recovery-token',
    'list-signer-packages',
    'load-draft',
    'log-event',
    'log-share-event',
    'presential-verification-start-session',
    'presential-verification-confirm-presence',
    'presential-verification-close-session',
    'record-protection-event',
    'register-custody-upload',
    'respond-to-changes',
    'reissue-signer-token',
    'resume-signer-link',
    'claim-signer-package-recovery',
    'save-draft',
    'start-signature-workflow',
    'store-encrypted-custody',
    'verify-invite-access',
    'workflow-fields',
  ],

  // Categoría 1b: Público con Token (validación por token de link/recipient)
  publicWithToken: [
    'accept-nda',
    'accept-share-nda',
    'presential-verification-session-preview',
    'signer-recovery-access',
    'send-signer-recovery-otp',
    'get-signer-recovery-url',
    'verify-access',
  ],

  // Categoría 2: Firmante Externo (validateSignerAccessToken)
  externalSigner: [
    'accept-workflow-nda',
    'apply-signer-signature',
    'confirm-signer-identity',
    'log-workflow-event',
    'record-evidence-download',
    'reject-signature',
    'send-signer-otp',
    'verify-signer-otp',
  ],

  // Categoría 3: Cron Interno (requireCronSecret o requireInternalAuth)
  cronInternal: [
    'anchor-bitcoin',
    'anchor-polygon',
    'finalize-document',
    'fase1-executor',
    'new-document-canonical-trigger',
    'notify-artifact-ready',
    'notify-document-signed',
    'orchestrator',
    'process-bitcoin-anchors',
    'process-polygon-anchors',
    'process-signer-signed',
    'record-custody-key-rotation',
    'send-invariant-alert',
    'send-pending-emails',
  ],

  // Categoría 4: Webhook Externo
  webhookExternal: [
    'signnow-webhook',
  ],

  // Categoría 5: Público sin Auth
  publicNoAuth: [
    'accept-invite-nda',
    'anchor-health',
    'anchoring-health-check',
    'build-artifact',
    'build-final-artifact',
    'dead-jobs',
    'feature-flags-status',
    'generate-signature-evidence',
    'get-eco-url',
    'get-share-metadata',
    'health',
    'health-check',
    'legal-timestamp',
    'log-ecox-event',
    'monitoring-dashboard',
    'notify-document-certified',
    'presential-verification-get-acta',
    'record-signer-receipt',
    'repair-missing-anchor-events',
    'request-document-changes',
    'run-tsa',
    'send-share-otp',
    'send-signer-package',
    'send-welcome-email',
    'set-feature-flag',
    'signer-access',
    'signnow',
    'signing-keys',
    'submit-anchor-bitcoin',
    'submit-anchor-polygon',
    'verify-ecox',
    'verify-share-otp',
    'verify-workflow-hash',
  ],
};

// Patrones de validación por categoría
const VALIDATION_PATTERNS = {
  userLogged: [
    { label: 'auth.getUser()', regex: /\.auth\.getUser\(/ },
    { label: 'getUser(token)', regex: /getUser\(\s*token\s*\)/ },
  ],
  publicWithToken: [
    { label: 'token validation', regex: /tokenHash|token_hash|crypto\.subtle\.digest/ },
  ],
  externalSigner: [
    { label: 'validateSignerAccessToken', regex: /validateSignerAccessToken/ },
  ],
  cronInternal: [
    { label: 'requireCronSecret', regex: /requireCronSecret/ },
    { label: 'requireInternalAuth', regex: /requireInternalAuth/ },
    { label: 'cron_secret header', regex: /x-cron-secret|x-internal-secret/ },
  ],
  webhookExternal: [
    { label: 'webhook signature', regex: /webhook|signature|signnow/i },
  ],
  publicNoAuth: [],
};

test('auth surface sealed doc must define authentication categories and matrix', async () => {
  const content = await fs.readFile(AUTH_SURFACE_DOC, 'utf8');

  expect(content).toContain('Auth Surface Sealed (Milestone)');
  expect(content).toContain('Categorías de Autenticación');
  expect(content).toContain('Usuario Logueado');
  expect(content).toContain('Firmante Externo');
  expect(content).toContain('Cron Interno');
  expect(content).toContain('Webhook Externo');
  expect(content).toContain('Público sin Auth');
  expect(content).toContain('verify_jwt');
  expect(content).toContain('Invariantes de Cierre');
});

test('all edge functions must have explicit authentication according to their category', async () => {
  const entries = await fs.readdir(FUNCTIONS_ROOT, { withFileTypes: true });
  const offenders: string[] = [];
  const missingCategory: string[] = [];

  const allCategories = [
    ...AUTH_CATEGORIES.userLogged,
    ...AUTH_CATEGORIES.publicWithToken,
    ...AUTH_CATEGORIES.externalSigner,
    ...AUTH_CATEGORIES.cronInternal,
    ...AUTH_CATEGORIES.webhookExternal,
    ...AUTH_CATEGORIES.publicNoAuth,
  ];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    if (entry.name === 'tests') continue;

    const indexFile = path.join(FUNCTIONS_ROOT, entry.name, 'index.ts');
    let content: string;
    try {
      content = await fs.readFile(indexFile, 'utf8');
    } catch {
      continue;
    }

    // Verificar si la función está en alguna categoría
    if (!allCategories.includes(entry.name)) {
      missingCategory.push(entry.name);
      continue;
    }

    // Determinar categoría de la función
    let category: keyof typeof AUTH_CATEGORIES | null = null;
    for (const [catName, functions] of Object.entries(AUTH_CATEGORIES)) {
      if (functions.includes(entry.name)) {
        category = catName as keyof typeof AUTH_CATEGORIES;
        break;
      }
    }

    if (!category) continue;

    // Verificar patrón de validación según categoría
    const patterns = VALIDATION_PATTERNS[category as keyof typeof VALIDATION_PATTERNS];
    if (!patterns || patterns.length === 0) continue;

    const matched = patterns.filter((pattern) => pattern.regex.test(content));
    if (matched.length === 0) {
      const expectedPatterns = patterns.map((p) => p.label).join(' o ');
      offenders.push(`${entry.name}: falta ${expectedPatterns} (categoría: ${category})`);
    }
  }

  expect(offenders).toEqual([]);
  expect(missingCategory).toEqual([]);
});

test('config.toml verify_jwt must be consistent with auth categories', async () => {
  const configContent = await fs.readFile(CONFIG_FILE, 'utf8');

  // Functions que DEBEN tener verify_jwt = true
  const mustHaveVerifyJwtTrue = [
    ...AUTH_CATEGORIES.userLogged,
    'record-evidence-download',
  ];

  // Functions que PUEDEN tener verify_jwt = false (excepciones justificadas)
  const canHaveVerifyJwtFalse = [
    ...AUTH_CATEGORIES.publicWithToken,
    ...AUTH_CATEGORIES.externalSigner,
    ...AUTH_CATEGORIES.cronInternal,
    ...AUTH_CATEGORIES.webhookExternal,
    ...AUTH_CATEGORIES.publicNoAuth,
  ];

  const offenders: string[] = [];

  for (const funcName of mustHaveVerifyJwtTrue) {
    // Saltar excepciones documentadas
    if (canHaveVerifyJwtFalse.includes(funcName)) continue;

    const sectionRegex = new RegExp(`\\[functions\\.${funcName}\\]\\s*verify_jwt\\s*=\\s*(true|false)`, 'i');
    const match = configContent.match(sectionRegex);

    if (!match) {
      // Si no tiene sección explícita, verificar si usa verify_jwt por defecto
      // (Supabase default es true, así que está ok)
      continue;
    }

    const value = match[1].toLowerCase();
    if (value !== 'true') {
      offenders.push(`${funcName}: debe tener verify_jwt = true (categoría: userLogged)`);
    }
  }

  expect(offenders).toEqual([]);
});

test('prebeta fire drill must include auth surface sealed guard', async () => {
  const content = await fs.readFile(PREBETA_FIRE_DRILL_FILE, 'utf8');

  expect(content).toContain('Auth surface sealed guard');
  expect(content).toContain('auth_surface_sealed_guard.test.ts');
});

test('no function should have commented-out authentication', async () => {
  const entries = await fs.readdir(FUNCTIONS_ROOT, { withFileTypes: true });
  const offenders: string[] = [];

  // Patrones más específicos para detectar auth genuinamente comentada (no en comentarios de docs)
  const commentedAuthPatterns = [
    /\/\/\s*const\s+\{[^}]*\}\s*=\s*await\s+supabase\.auth\.getUser\(/,
    /\/\/\s*const\s+\{[^}]*\}\s*=\s*await\s+validateSignerAccessToken/,
    /\/\/\s*const\s+authError\s*=\s*requireCronSecret/,
    /\/\/\s*if\s*\(\s*authError\s*\)/,
    /\/\/\s*return\s+new\s+Response.*Unauthorized/,
  ];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    if (entry.name === 'tests') continue;

    const indexFile = path.join(FUNCTIONS_ROOT, entry.name, 'index.ts');
    let content: string;
    try {
      content = await fs.readFile(indexFile, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of commentedAuthPatterns) {
      if (pattern.test(content)) {
        offenders.push(`${entry.name}: tiene autenticación comentada`);
        break;
      }
    }
  }

  expect(offenders).toEqual([]);
});
