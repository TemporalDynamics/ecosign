-    "MIFIEL_API_KEY": "your-mifiel-api-key",
-    "SIGNNOW_API_KEY": "your-signnow-api-key",
-    "STRIPE_SECRET_KEY": "your-stripe-secret-key",
     password: '',
-            type="password"
       export RESEND_API_KEY='...'  # optional
+export RESEND_API_KEY="re_xxxxxxxxxxxx"  # Opcional, solo si quieres emails
+*/5 * * * * cd /home/manu/verifysign && SUPABASE_URL="https://xxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="xxx" RESEND_API_KEY="xxx" /usr/bin/python3 scripts/processAnchorsWithNotifications.py --limit 20 >> /var/log/ecosign-anchors.log 2>&1
+Environment="RESEND_API_KEY=xxx"
+if [ -z "$RESEND_API_KEY" ]; then
+    echo "⚠️  RESEND_API_KEY not set (optional, for email notifications)"
+    echo "   Export it with: export RESEND_API_KEY='re_xxxxx'"
+    echo "✅ RESEND_API_KEY is set"
-    *   **Authentication**: Supabase Auth (email/password, magic links)
-1.  **User Interaction**: User enters email and password in `LoginPage.jsx`.
-2.  **Frontend Call**: `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()` is called from `client/src/lib/supabaseClient.ts`.
-RESEND_API_KEY=re_aEWVjHJF_JP16N6VerN4VBjXvTBNi3hRU
    1. Resend API Key → Supabase Secrets
    1. Configure RESEND_API_KEY in Supabase
+supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui
+# 2. Settings → Edge Functions → Secrets
+# 3. Agregar nuevo secret:
+#    - Key: RESEND_API_KEY
+#    - Value: re_tu_api_key_aqui
+supabase secrets list
+- [ ] API Key configurada en Supabase Secrets
+- [Supabase Secrets](https://supabase.com/docs/guides/cli/managing-config#managing-secrets)
                 value={formData.password}
                   value={formData.confirmPassword}
+POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
+POLYGON_PRIVATE_KEY=0x... (wallet privada para firmar transacciones)
+POLYGON_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
+POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
+POLYGON_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FROM_METAMASK
+      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
+ * Configuración: Requiere RESEND_API_KEY en las variables de entorno.
+  const resendApiKey = Deno.env.get('RESEND_API_KEY');
+    console.error('❌ RESEND_API_KEY no configurado');
-canonical = JCS.serialize(eco_without_signature)hash_meta = SHA256(canonical)signature = Ed25519.sign(hash_meta, private_key)
+      url: "https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY",
+      accounts: ["TU_PRIVATE_KEY_SIN_0x"]
+Una vez desplegado el contrato, configura estos secrets en Supabase:
+1. Ve a **Project Settings** → **Edge Functions** → **Manage secrets**
+2. Agrega estos 3 secrets:
+POLYGON_PRIVATE_KEY=tu_private_key_aqui_sin_0x
+# Configurar secrets
+supabase secrets set POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En"
+supabase secrets set POLYGON_PRIVATE_KEY="tu_private_key"
+supabase secrets set POLYGON_CONTRACT_ADDRESS="0x..."
+1. **Private Key**: Guárdala SOLO en Supabase Secrets (encriptado)
+2. ✅ Configurar secrets en Supabase
+### PASO 2: Configurar Secrets en Supabase (5 minutos)
+| `POLYGON_PRIVATE_KEY` | `tu_private_key_sin_0x` | Metamask (ver abajo) |
+   - Confirmar password
+   - Settings → Edge Functions → Manage secrets
+   - Click "New secret"
+   - Agregar los 3 secrets:
+   Name: POLYGON_PRIVATE_KEY
+   Value: [tu_private_key_sin_0x]
+# Configurar secrets
+supabase secrets set POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/OBJkEAhQmQDkgNiqFE-En"
+supabase secrets set POLYGON_PRIVATE_KEY="tu_private_key"
+supabase secrets set POLYGON_CONTRACT_ADDRESS="0x..."
+- **Solución**: Verificar que los 3 secrets estén configurados en Supabase
+1. **Private key en secrets**: Nunca expuesta en código
+2. ✅ Configurar secrets en Supabase
+   - Configurar secrets en Supabase:
+     - `POLYGON_PRIVATE_KEY` (Metamask)
+   - Configurar secrets
+supabase secrets set RESEND_API_KEY="re_..."
+const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
+    const privateKey = Deno.env.get('POLYGON_PRIVATE_KEY') // Tu private key de Metamask
+        details: 'Missing RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS'
+    {/* Password input */}
+            type="password"
+├─ Secret key seguro
+├─ generate-link: firma el token con secret
+const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
+  password: string
+      password,
+  const { error: signInError } = await userClient.auth.signInWithPassword({ 
+    password 
-      password: 'test-password-123',
-      password: 'test-password-123',
+      'test-password-123'
+      'test-password-123'
-    await supabaseUserA.auth.signInWithPassword({
-      password: 'test-password-123'
-    await supabaseUserB.auth.signInWithPassword({
-      password: 'test-password-123'
-      password: 'test-password-123',
+      'test-password-123'
-    await supabaseUser.auth.signInWithPassword({
-      password: 'test-password-123'
+CSRF_SECRET=test-secret-for-testing-csrf-32-bytes
+S3_SECRET_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
+  const signature = createHmac('sha256', process.env.CSRF_SECRET!)
+- ✅ Seguridad (CSRF_SECRET, NDA_ENCRYPTION_KEY)
+  password: string
+      password,
+  const { error: signInError } = await userClient.auth.signInWithPassword({ 
+    password 
+      'test-password-123'
+      'test-password-123'
+      'test-password-123'
+  -d '{"email":"test@example.com","password":"password123","email_confirm":true}'
+export async function createTestUser(email: string, password: string): Promise<{ userId: string; client: SupabaseClient }> {
+      password,
+  await userClient.auth.signInWithPassword({ email, password });
+      'test-password-123'
-   - `CSRF_SECRET` - Secreto para tokens CSRF (mínimo 32 caracteres)
+      password: 'test-password-123',
+      password: 'test-password-123',
+    await supabaseUserA.auth.signInWithPassword({
+      password: 'test-password-123'
+    await supabaseUserB.auth.signInWithPassword({
+      password: 'test-password-123'
+      password: 'test-password-123',
+    await supabaseUser.auth.signInWithPassword({
+      password: 'test-password-123'
-      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
+        signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
+CSRF_SECRET=test-secret-for-testing-csrf-32-bytes
+Vitest security suites rely on the `.env.local` file that `tests/setup.ts` loads before executing any tests. Copy `.env.example` to `.env.local` and populate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; the `CSRF_SECRET` and `NDA_ENCRYPTION_KEY` values already shown in `.env.example` are safe defaults but can be overridden per project. Keeping `client/.env` and `.env.local` in sync allows the suite to map Vite-prefixed variables automatically so the security tests run without missing vars errors.
+   - `CSRF_SECRET` - Secreto para tokens CSRF (mínimo 32 caracteres)
-      password: 'test123456',
-      password: 'test123456',
-    const { data: sessionA, error: sessionAError } = await adminClient.auth.signInWithPassword({
-      password: 'test123456'
-    const { data: sessionB, error: sessionBError } = await adminClient.auth.signInWithPassword({
-      password: 'test123456'
-      password: 'test123456',
-      password: 'test123456',
-    const { data: sessionA, error: sessionAError } = await adminClient.auth.signInWithPassword({
-      password: 'test123456'
-    const { data: sessionB, error: sessionBError } = await adminClient.auth.signInWithPassword({
-      password: 'test123456'
-    await userAClient.storage.from(BUCKET).upload(filePath, new File(['secret'], 'private.eco'), { upsert: true });
 process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing-csrf-32-bytes';
+      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
+      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
+canonical = JCS.serialize(eco_without_signature)hash_meta = SHA256(canonical)signature = Ed25519.sign(hash_meta, private_key)
+    *   **Authentication**: Supabase Auth (email/password, magic links)
+1.  **User Interaction**: User enters email and password in `LoginPage.jsx`.
+2.  **Frontend Call**: `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()` is called from `client/src/lib/supabaseClient.ts`.
     throw new Error('SIGNNOW_API_KEY env var is required to create invites');
+        throw new Error('PDF is encrypted or password-protected. Please remove encryption before signing.');
+- [ ] Configurar `SIGNNOW_API_KEY` en variables de entorno
+RESEND_API_KEY=<tu-resend-key>  # Opcional
+SIGNNOW_API_KEY=<tu-signnow-key>  # Opcional
+- Dashboard → Settings → API → `service_role` secret
+RESEND_API_KEY=<tu-resend-key>
+SIGNNOW_API_KEY=<tu-signnow-key>
+- Dashboard → Settings → API → `service_role` secret
+- ⚠️ Puede fallar con "SIGNNOW_API_KEY missing" (normal si no tienes cuenta)
+RESEND_API_KEY=tu-resend-api-key  # Opcional, para notificaciones
+- Verificar `RESEND_API_KEY` en las variables de entorno
+const resendApiKey = Deno.env.get('RESEND_API_KEY');
+- **Solución**: Configurar SIGNNOW_API_KEY
+SIGNNOW_API_KEY=tu_api_key_de_signnow
+### "SIGNNOW_API_KEY missing"
+    console.warn('Cannot download signed document: SIGNNOW_API_KEY missing');
-        error: 'SIGNNOW_API_KEY missing'
+        error: 'SIGNNOW_API_KEY missing - legal signatures require SignNow integration'
+RESEND_API_KEY=re_aEWVjHJF_JP16N6VerN4VBjXvTBNi3hRU
- * secrets or a dedicated backend yet.
+function getSecret(provided?: string): string {
+  const secret = provided || process.env.CSRF_SECRET;
+  if (!secret) {
+    throw new Error('CSRF secret is not configured');
+  return secret;
+export function generateCSRFToken(userId: string, secret?: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): CSRFToken {
+  const resolvedSecret = getSecret(secret);
+  const signature = createHmac('sha256', resolvedSecret).update(payload).digest('hex');
+export function validateCSRFToken(token: string | null | undefined, expectedUserId: string, secret?: string): boolean {
+  const resolvedSecret = getSecret(secret);
+  const expectedSignature = createHmac('sha256', resolvedSecret).update(payload).digest('hex');
+function getKey(secret?: string): Buffer {
+  const key = secret || process.env.NDA_ENCRYPTION_KEY;
+export async function encryptPayload(payload: unknown, secret?: string): Promise<string> {
+  const key = getKey(secret);
+export async function decryptPayload(encrypted: string, secret?: string): Promise<unknown> {
+  const key = getKey(secret);
+    *   **Authentication**: Supabase Auth (email/password, magic links)
+1.  **User Interaction**: User enters email and password in `LoginPage.jsx`.
+2.  **Frontend Call**: `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()` is called from `client/src/lib/supabaseClient.ts`.
+  RESEND_API_KEY=... \\
+RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
+if not RESEND_API_KEY:
+    print('WARNING: RESEND_API_KEY not provided, email notifications will be skipped.', file=sys.stderr)
+    if not RESEND_API_KEY or not user_email:
+        resend.api_key = RESEND_API_KEY
+# secret_key = "env(SECRET_VALUE)"
+openai_api_key = "env(OPENAI_API_KEY)"
+# Passwords shorter than this value will be rejected as weak. Minimum 6, recommended 8 or more.
+minimum_password_length = 6
+# Passwords that do not meet the following requirements will be rejected as weak. Supported values
+password_requirements = ""
+# secret = ""
+# If enabled, users will need to reauthenticate or have logged in recently to change their password.
+secure_password_change = false
+# Controls the minimum amount of time that must pass before sending another signup confirmation or password reset email.
+# pass = "env(SENDGRID_API_KEY)"
+# [auth.email.notification.password_changed]
+# subject = "Your password has been changed"
+# content_path = "./templates/password_changed_notification.html"
+# DO NOT commit your OAuth provider secret to git. Use environment variable substitution instead:
+secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"
+# [edge_runtime.secrets]
+# secret_key = "env(SECRET_VALUE)"
+# Configures AWS_SECRET_ACCESS_KEY for S3 bucket
+s3_secret_key = "env(S3_SECRET_KEY)"
+const signNowApiKey = Deno.env.get('SIGNNOW_API_KEY')
+    throw new Error('SIGNNOW_API_KEY env var is required to upload documents');
+    throw new Error('SIGNNOW_API_KEY env var is required to create invites');
+        error: 'SIGNNOW_API_KEY missing'
-  const signature = createHmac('sha256', process.env.CSRF_SECRET!)
-  const expectedSignature = createHmac('sha256', process.env.CSRF_SECRET!)
+process.env.CSRF_SECRET = 'test-secret-key-for-csrf-validation';
-    // Asegurarse de que la variable de entorno CSRF_SECRET está definida
-    process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing';
     const signature = createHmac('sha256', process.env.CSRF_SECRET!)
+      password: 'test123456',
+      password: 'test123456',
+    const { data: sessionA, error: sessionAError } = await adminClient.auth.signInWithPassword({
+      password: 'test123456'
+    const { data: sessionB, error: sessionBError } = await adminClient.auth.signInWithPassword({
+      password: 'test123456'
+      password: 'test123456',
+      password: 'test123456',
+    const { data: sessionA, error: sessionAError } = await adminClient.auth.signInWithPassword({
+      password: 'test123456'
+    const { data: sessionB, error: sessionBError } = await adminClient.auth.signInWithPassword({
+      password: 'test123456'
+    await userAClient.storage.from(BUCKET).upload(filePath, new File(['secret'], 'private.eco'), { upsert: true });
+const CSRF_SECRET = process.env.CSRF_SECRET;
+if (!CSRF_SECRET) {
+  throw new Error('CSRF_SECRET environment variable is not set!');
+  const signature = createHmac('sha256', CSRF_SECRET)
+    const expectedSignature = createHmac('sha256', CSRF_SECRET)
-process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing';
+process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing-csrf-32-bytes';
-        signInWithPassword: vi.fn(),
+CSRF_SECRET=clave_secreta_para_csrf
+  const signature = createHmac('sha256', process.env.CSRF_SECRET!)
+  const expectedSignature = createHmac('sha256', process.env.CSRF_SECRET!)
+    // Asegurarse de que la variable de entorno CSRF_SECRET está definida
+    process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing';
+    const signature = createHmac('sha256', process.env.CSRF_SECRET!)
+process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-testing';
+        signInWithPassword: vi.fn(),
+ * secrets or a dedicated backend yet.
-- Email/password authentication
-   - Database Password: (guardar en lugar seguro)
-2. Personalizar "Confirm Signup" y "Reset Password"
-# CSRF Secret (generar random de 32+ chars)
-HMAC_SIGN_SECRET=tu-secret-aqui-minimo-32-caracteres
-✅ Verificar `HMAC_SIGN_SECRET` configurado
-1. **Rotar secrets** si fueron expuestos en logs públicos
-const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
-      // Return client secret for frontend payment processing
-        client_secret: paymentIntent.client_secret,
-const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
-      // Return client secret for frontend payment processing
-        client_secret: paymentIntent.client_secret,
-  const [password, setPassword] = useState("");
-        const { error } = await supabase.auth.signInWithPassword({ email, password });
-          password,
-            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Contraseña</label>
-              type="password"
-              id="password"
-              value={password}
-              onChange={(e) => setPassword(e.target.value)}
+- Uses Supabase Auth (email/password, magic links, etc.) for session handling.
+- `.env` at repo root for shared secrets (never committed)
+2. Name e.g. `verifysign-prod`, choose region near your users, store the generated database password securely.
+SUPABASE_SERVICE_ROLE_KEY=super-secret
+HMAC_SIGN_SECRET=32+chars-random
+- Rotate `HMAC_SIGN_SECRET` and Supabase keys if they were ever printed in logs.
+- Enable Vercel protection (rate limiting, password-protected preview envs if needed).
-    input[type="email"], input[type="password"] {
-        <label for="password">Contraseña</label>
-        <input type="password" id="password" autocomplete="current-password" required>
-      const password = document.getElementById('password').value;
-        const { data, error } = await supabase.auth.signInWithPassword({
-          password: password,
-# CSRF Secret
-HMAC_SIGN_SECRET=your-secret-key
-   - `HMAC_SIGN_SECRET` no configurado o cambió
-    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
-    if (!stripeSecretKey) {
-      console.error("STRIPE_SECRET_KEY no configurada");
-          message: "Stripe no está configurado todavía. Por favor, configura STRIPE_SECRET_KEY en las variables de entorno de Netlify.",
-    const stripe = require("stripe")(stripeSecretKey);
-const getSecret = (): string => {
-  const secret = process.env.HMAC_SIGN_SECRET;
-  if (!secret) {
-    throw new Error('HMAC_SIGN_SECRET not configured');
-  return secret;
-  const secret = getSecret();
-  const signature = createHmac('sha256', secret)
-    const secret = getSecret();
-    const expectedSignature = createHmac('sha256', secret)
-    input[type="email"], input[type="password"] {
-        <label for="password">Contraseña</label>
-        <input type="password" id="password" autocomplete="new-password" required>
-        <label for="confirm-password">Confirmar Contraseña</label>
-        <input type="password" id="confirm-password" autocomplete="new-password" required>
-      const password = document.getElementById('password').value;
-      const confirmPassword = document.getElementById('confirm-password').value;
-      if (password !== confirmPassword) {
-      if (password.length < 6) {
-          password: password,
-El “cómo” se aplican las operaciones, se resuelven los tiempos, y se ejecuta el orden determinista es el secreto industrial.
-2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
-│    tapujos sin secretos hay gente que le gusta informarse y nosotros no │
- │    62   +             <label htmlFor="password"               │
- │    64   +               type="password"                       │
- │    65   +               id="password"                         │
- │    67   +               value={password}                      │
- │           setPassword(e.target.value)}                        │
-│    SUPABASE_SERVICE_KEY, HMAC_SIGN_SECRET                               │
-                            <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
-                        <input type="password" id="password" name="password" required autocomplete="current-password" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[var(--color-primary-cyan)] focus:border-[var(--color-primary-cyan)] sm:text-sm">
-                        <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
-                        <input type="password" id="password" name="password" required autocomplete="new-password" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[var(--color-primary-cyan)] focus:border-[var(--color-primary-cyan)] sm:text-sm">
-        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
-        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
-        const { error } = await supabase.auth.signUp({ email, password });
+          password,
           password: password,
+   - Get your Mifiel and SignNow keys ready (like passwords)
+  apiKey: process.env.MIFIEL_API_KEY,
+  secretKey: process.env.MIFIEL_SECRET_KEY
+process.env.STRIPE_SECRET_KEY
+MIFIEL_API_KEY=xxx        # ❌ NO EXISTE
+MIFIEL_SECRET_KEY=xxx     # ❌ NO EXISTE
+SIGNNOW_API_KEY=xxx       # ❌ NO EXISTE
+const signNow = new SignNow({ apiKey: process.env.SIGNNOW_API_KEY });
+  - Login: `supabase.auth.signInWithPassword()`
+   - Contraseña: `password123` (mínimo 6 caracteres)
+   - Confirmar contraseña: `password123`
+   - Contraseña: `password123`
+**Input**: `password123` vs `password456`
+- [x] `LoginPage.jsx` usa `supabase.auth.signInWithPassword()`
+                  <li>• Exporta y guarda tus claves en un lugar seguro (USB, password manager)</li>
+const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
+      // Return client secret for frontend payment processing
+        client_secret: paymentIntent.client_secret,
+const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
+      // Return client secret for frontend payment processing
+        client_secret: paymentIntent.client_secret,
+  // For now, we'll simulate the payment using the client_secret from the backend
+      // 3. Confirm payment with the client_secret from integrationData
+import { getSecrets } from './vault'; // Your secret manager
+    const secrets = await getSecrets(`tenant/${tenantId}/keys`);
+    if (!secrets.privateKey) {
+      privateKey: Buffer.from(secrets.privateKey, 'hex'),
+      publicKey: Buffer.from(secrets.publicKey, 'hex')
+    await putSecrets(`tenant/${tenantId}/keys`, {
+- Use secrets managers (HashiCorp Vault, 1Password)
+**Attack**: Extract secrets via power analysis, electromagnetic radiation, or cache timing.
+// Avoid conditional branches based on secrets
+process.env.PRIVATE_KEY
+const { data } = await vaultClient.read('secret/eco-packer/signing-key');
-        "@azure/keyvault-secrets": "^4.9.0",
-        "@azure/keyvault-secrets": {
+    "MIFIEL_API_KEY": "your-mifiel-api-key",
+    "SIGNNOW_API_KEY": "your-signnow-api-key",
+    "STRIPE_SECRET_KEY": "your-stripe-secret-key",
+Material: ECO_SIGNING_PRIVATE_KEY / ECO_SIGNING_PUBLIC_KEY (PEM o Base64 DER)
-    const resend = new Resend(process.env.RESEND_API_KEY);
-const HMAC_SECRET = process.env.HMAC_SIGN_SECRET || process.env.HMAC_SECRET;
-if (process.env.NETLIFY_SITE_URL && (!HMAC_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY)) {
-  throw new Error('Missing required environment variables in production: HMAC_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY');
-if (!HMAC_SECRET) {
-  console.warn('⚠️ Missing HMAC_SECRET environment variable. Using a default "dev-secret". This is not secure for production.');
-const hmacSecret = HMAC_SECRET || 'dev-secret';
-      const sig = hmac(payload, hmacSecret);
-      const expectedSig = hmac(payload, hmacSecret);
-function hmac(text, secret) {
-  return crypto.createHmac('sha256', secret).update(text).digest('hex');
     password: '',
     confirmPassword: ''
+        const { data, error } = await supabase.auth.signInWithPassword({
+          password: formData.password,
+        if (formData.password !== formData.confirmPassword) {
+        if (formData.password.length < 6) {
+          password: formData.password,
+        setFormData({ email: '', password: '', confirmPassword: '' });
+      } else if (err.message.includes('Password should be at least 6 characters')) {
-Best practice: Backup keys in encrypted vault (1Password, LastPass, etc.)
-- Keep Confidential Information secret
         <label for="password">Contraseña</label>
-        <input type="password" id="password" required>
+        <input type="password" id="password" autocomplete="current-password" required>
       const password = document.getElementById('password').value;
-      const { data, error } = await supabase.auth.signInWithPassword({
-        password: password,
+        const { data, error } = await supabase.auth.signInWithPassword({
+          password: password,
+  const { data, error } = await supabase.auth.signUp({ email, password });
+    const { data, error } = await supabase.auth.signInWithPassword({ email,
+  password });
+  Mitigación: Usar Gmail App Password (5 min setup)
-JWT_SECRET=your-jwt-secret-key-here
-EMAIL_PASS=your-app-password-here
-BLOCKCHAIN_PRIVATE_KEY=your-private-key-here
-export interface EcoGenerationSecrets {
-  constructor(secrets: EcoGenerationSecrets) {
-    if (!secrets.privateKey || !secrets.keyId) {
-    this.key = normalizePrivateKey(secrets.privateKey);
-    this.keyId = secrets.keyId;
-  password: string;
         <label for="password">Contraseña</label>
-        <input type="password" id="password" required>
+        <input type="password" id="password" autocomplete="new-password" required>
         <label for="confirm-password">Confirmar Contraseña</label>
-        <input type="password" id="confirm-password" required>
+        <input type="password" id="confirm-password" autocomplete="new-password" required>
       const password = document.getElementById('password').value;
       const confirmPassword = document.getElementById('confirm-password').value;
-        password: password,
+      if (password.length < 6) {
+          password: password,
+HMAC_SIGN_SECRET=replace-me
+RESEND_API_KEY=your-resend-key
+STRIPE_SECRET_KEY=sk_test_xxx
+MIFIEL_API_KEY=your-mifiel-token
+POLYGON_PRIVATE_KEY=0xabc123
+   - Tarea: reemplazar el login simulado por la llamada real a Supabase (`signInWithPassword`) y propagar la sesión al `DashboardPage`.  
+  - **Auth**: Supabase Auth (Email/Password + policies).
+JWT_SECRET=your-jwt-secret-key-here
+EMAIL_PASS=your-app-password-here
+BLOCKCHAIN_PRIVATE_KEY=your-private-key-here
+export interface EcoGenerationSecrets {
+  constructor(secrets: EcoGenerationSecrets) {
+    if (!secrets.privateKey || !secrets.keyId) {
+    this.key = normalizePrivateKey(secrets.privateKey);
+    this.keyId = secrets.keyId;
+  password: string;
+El “cómo” se aplican las operaciones, se resuelven los tiempos, y se ejecuta el orden determinista es el secreto industrial.
+2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
+│    tapujos sin secretos hay gente que le gusta informarse y nosotros no │
+ │    62   +             <label htmlFor="password"               │
+ │    64   +               type="password"                       │
+ │    65   +               id="password"                         │
+ │    67   +               value={password}                      │
+ │           setPassword(e.target.value)}                        │
+│    SUPABASE_SERVICE_KEY, HMAC_SIGN_SECRET                               │
+                            <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
+                        <input type="password" id="password" name="password" required autocomplete="current-password" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[var(--color-primary-cyan)] focus:border-[var(--color-primary-cyan)] sm:text-sm">
+                        <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
+                        <input type="password" id="password" name="password" required autocomplete="new-password" class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[var(--color-primary-cyan)] focus:border-[var(--color-primary-cyan)] sm:text-sm">
+        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
+        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
+Best practice: Backup keys in encrypted vault (1Password, LastPass, etc.)
+- Keep Confidential Information secret
+- Plan A: Usar Gmail App Password (más fácil)
+1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
+2. Crear App Password → Copiar (16 chars)
+   - Password: `[App Password copiado]`
+   - Password: `[API key de Resend]`
+3. **service_role secret** key ⚠️
+# HMAC Secret (generar random)
+HMAC_SIGN_SECRET=ejecuta-openssl-rand-base64-32-y-pega-aqui
+### Generar HMAC_SIGN_SECRET:
+Copiar output y pegar en HMAC_SIGN_SECRET
+5. Password: `Test123456`
+   Password: [TU API KEY de Resend]
+1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
+2. Crear App Password
+3. Copiar password (16 chars sin espacios)
+Password: [App Password de Gmail]
+**Reset Password**:
+- ✅ `service_role` `secret` key ⚠️
+# HMAC Secret (generar nuevo random de 32+ chars)
+HMAC_SIGN_SECRET=tu-secret-super-random-aqui-minimo-32-caracteres
+**Generar HMAC_SIGN_SECRET** (en terminal):
+# Copiar output y pegar en HMAC_SIGN_SECRET
+4. Password: `Test123456`
+SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (SECRET!)
+HMAC_SIGN_SECRET=tu-secret-aqui
+HMAC_SIGN_SECRET=tu-secret-de-32-caracteres-minimo
+# HMAC Secret (compartido con backend)
+HMAC_SIGN_SECRET=min-32-caracteres-random
+HMAC_SIGN_SECRET=min-32-caracteres-random
+  - signIn, signUp, signOut, resetPassword
+  - Password reset funcional
+  - Validación de inputs (email, password 8+ chars)
+- ⚠️ `HMAC_SIGN_SECRET` - Solo en Netlify Functions
+  - signIn, signUp, signOut, resetPassword
+  - Password reset funcional
+   - Database Password: (guardar en lugar seguro)
+2. Personalizar "Confirm Signup" y "Reset Password"
+# CSRF Secret (generar random de 32+ chars)
+HMAC_SIGN_SECRET=tu-secret-aqui-minimo-32-caracteres
+✅ Verificar `HMAC_SIGN_SECRET` configurado
+1. **Rotar secrets** si fueron expuestos en logs públicos
    - Password reset
+    return <button onClick={() => signIn('email@example.com', 'password')}>Login</button>;
+  signIn: (email: string, password: string) => Promise<void>;
+  signUp: (email: string, password: string) => Promise<void>;
+  resetPassword: (email: string) => Promise<void>;
+   * Sign In con email y password
+  const signIn = async (email: string, password: string): Promise<void> => {
+      const { data, error } = await supabase.auth.signInWithPassword({
+        password
+   * Sign Up con email y password
+  const signUp = async (email: string, password: string): Promise<void> => {
+        password,
+   * Resetear password
+  const resetPassword = async (email: string): Promise<void> => {
+      const { error } = await supabase.auth.resetPasswordForEmail(email, {
+        redirectTo: `${window.location.origin}/reset-password`
+    resetPassword
+  const { signIn, signUp, resetPassword, error: authError } = useAuth();
+  const [password, setPassword] = useState('');
+  const [confirmPassword, setConfirmPassword] = useState('');
+    if (!email || !password) {
+    if (isSignUp && password !== confirmPassword) {
+    if (password.length < 8) {
+        await signUp(email, password);
+        await signIn(email, password);
+  const handleForgotPassword = async () => {
+      await resetPassword(email);
+            {/* Password */}
+              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
+                  id="password"
+                  type="password"
+                  value={password}
+                  onChange={(e) => setPassword(e.target.value)}
+            {/* Confirm Password (solo signup) */}
+                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
+                    id="confirmPassword"
+                    type="password"
+                    value={confirmPassword}
+                    onChange={(e) => setConfirmPassword(e.target.value)}
+            {/* Forgot Password Link */}
+                  onClick={handleForgotPassword}
+   - **Database Password**: Guardar en 1Password/Bitwarden
+# Crear App Password en Google Account
+# https://myaccount.google.com/apppasswords
+**Reset Password**:
+const handleLogin = async (email: string, password: string) => {
+  const { data, error } = await supabase.auth.signInWithPassword({
+    password
+const handleSignup = async (email: string, password: string) => {
+    password
+# CSRF Secret
+HMAC_SIGN_SECRET=tu-secret-de-32-chars-minimo
+  password: 'TestPass123!'
+# CSRF Secret
+HMAC_SIGN_SECRET=your-secret-key
+   - `HMAC_SIGN_SECRET` no configurado o cambió
+const getSecret = (): string => {
+  const secret = process.env.HMAC_SIGN_SECRET;
+  if (!secret) {
+    throw new Error('HMAC_SIGN_SECRET not configured');
+  return secret;
+  const secret = getSecret();
+  const signature = createHmac('sha256', secret)
+    const secret = getSecret();
+    const expectedSignature = createHmac('sha256', secret)
+  -- Habilitar: Email (password)
+    const handleLogin = async (email, password) => {
+      const { data, error } = await supabase.auth.signInWithPassword({
+        password
+INSERT INTO auth.users (email, encrypted_password)
-              <label htmlFor="password" className="block text-slate-300 mb-2">Contraseña *</label>
+              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">Contraseña *</label>
                 type="password"
                 id="password"
                 value={formData.password}
-                <label htmlFor="confirmPassword" className="block text-slate-300 mb-2">Confirmar Contraseña *</label>
+                <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">Confirmar Contraseña *</label>
                   type="password"
                   id="confirmPassword"
                   value={formData.confirmPassword}
+- Email/password authentication
+    password: '',
+    confirmPassword: ''
+              <label htmlFor="password" className="block text-slate-300 mb-2">Contraseña *</label>
+                type="password"
+                id="password"
+                name="password"
+                value={formData.password}
+                <label htmlFor="confirmPassword" className="block text-slate-300 mb-2">Confirmar Contraseña *</label>
+                  type="password"
+                  id="confirmPassword"
+                  name="confirmPassword"
+                  value={formData.confirmPassword}
+Se realizó una auditoría de seguridad del código de VerifySign para identificar posibles exposiciones de API keys, secrets, y vulnerabilidades comunes. El proyecto sigue buenas prácticas de seguridad en general.
         const { error } = await supabase.auth.signUp({ email, password });
+    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
+    if (!stripeSecretKey) {
+      console.error("STRIPE_SECRET_KEY no configurada");
+          message: "Stripe no está configurado todavía. Por favor, configura STRIPE_SECRET_KEY en las variables de entorno de Netlify.",
+    const stripe = require("stripe")(stripeSecretKey);
+  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
+3. Crea una cuenta con email/password
+Método: Email/Password
+- Secrets Manager (AWS/GCP/Azure)
+### 1. Gestión de Secretos
+const apiKey = process.env.API_KEY;
+- ✅ Email/Password con Supabase
+- Email/Password con Supabase Auth
+  const [password, setPassword] = useState("");
+        const { error } = await supabase.auth.signInWithPassword({ email, password });
+        const { error } = await supabase.auth.signUp({ email, password });
+            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">Contraseña</label>
+              type="password"
+              id="password"
+              value={password}
+              onChange={(e) => setPassword(e.target.value)}
-            <td>Proyecto_Secreto_Alpha.zip</td>
+            <td>Proyecto_Secreto_Alpha.zip</td>
+    input[type="email"], input[type="password"] {
+        <label for="password">Contraseña</label>
+        <input type="password" id="password" required>
+      const password = document.getElementById('password').value;
+      const { data, error } = await supabase.auth.signInWithPassword({
+        password: password,
+    input[type="email"], input[type="password"] {
+        <label for="password">Contraseña</label>
+        <input type="password" id="password" required>
+        <label for="confirm-password">Confirmar Contraseña</label>
+        <input type="password" id="confirm-password" required>
+      const password = document.getElementById('password').value;
+      const confirmPassword = document.getElementById('confirm-password').value;
+      if (password !== confirmPassword) {
+        password: password,
-const HMAC_SECRET = process.env.HMAC_SIGN_SECRET || process.env.HMAC_SECRET || 'dev-secret';
+const HMAC_SECRET = process.env.HMAC_SIGN_SECRET || process.env.HMAC_SECRET;
+if (process.env.NETLIFY_SITE_URL && (!HMAC_SECRET || !SUPABASE_URL || !SUPABASE_ANON_KEY)) {
+  throw new Error('Missing required environment variables in production: HMAC_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY');
+if (!HMAC_SECRET) {
+  console.warn('⚠️ Missing HMAC_SECRET environment variable. Using a default "dev-secret". This is not secure for production.');
+const hmacSecret = HMAC_SECRET || 'dev-secret';
-      const sig = hmac(payload, HMAC_SECRET);
+      const sig = hmac(payload, hmacSecret);
-      const expectedSig = hmac(payload, HMAC_SECRET);
+      const expectedSig = hmac(payload, hmacSecret);
+    const resend = new Resend(process.env.RESEND_API_KEY);
+const HMAC_SECRET = process.env.HMAC_SIGN_SECRET || process.env.HMAC_SECRET || 'dev-secret';
+      const sig = hmac(payload, HMAC_SECRET);
+      const expectedSig = hmac(payload, HMAC_SECRET);
+function hmac(text, secret) {
+  return crypto.createHmac('sha256', secret).update(text).digest('hex');
+        "@azure/keyvault-secrets": "^4.9.0",
+        "@azure/keyvault-secrets": {
+- SUPABASE_SERVICE_ROLE_KEY (USAR SOLO EN SERVERLESS; da permiso total — manténlo secreto)
+- MIFIEL_API_KEY (sandbox o prod)
+- RESEND_API_KEY (email)
+- STRIPE_SECRET_KEY
+- HMAC_SIGN_SECRET (para sign-url HMAC)
+  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MIFIEL_API_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY, HMAC_SIGN_SECRET, NETLIFY_SITE_URL.
+    - genera shortId, HMAC sign con secret y guarda pending record (documents.pending_signs) o en documents + flag.
+- MIFIEL_API_KEY
+- RESEND_API_KEY
+- STRIPE_SECRET_KEY
+- HMAC_SIGN_SECRET
