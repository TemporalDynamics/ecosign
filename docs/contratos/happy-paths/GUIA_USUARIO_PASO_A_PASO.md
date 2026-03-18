# EcoSign — Guia de usuario paso a paso

Documento que describe cada flujo desde la perspectiva del usuario:
que ve en pantalla, que clickea, y que pasa despues.

Dos apps separadas:
- **ecosign.app** — Dashboard completo (owner/propietario)
- **app.ecosign.app** — App minima para firmantes invitados

### Principio fundamental: Zero-Knowledge

EcoSign nunca ve el contenido de tus documentos. Todo el cifrado y
descifrado ocurre en tu navegador, usando AES-256-GCM (Web Crypto API).
El servidor solo recibe bytes cifrados — sin nombre real del archivo,
sin contenido, sin pistas sobre el tipo de documento. Esto aplica a
todos los flujos descritos abajo.

---

## Flujo 1: Crear cuenta y entrar

**Ruta:** `/login`

### Que ve el usuario

Pantalla con icono de candado y titulo "Protege tu trabajo". Dos modos
alternables: "Ingresar" y "Empezar a proteger".

### Paso a paso

1. **Elegir modo** — Click en "Empezar a proteger" (signup) o "Ingresar" (login)
2. **Completar formulario**
   - Signup: email + password + confirmar password
   - Login: email + password
3. **Click "Crear cuenta gratis"** (signup) o **"Iniciar Sesion"** (login)
4. **Verificar email** (solo signup) — Llega un email con link de confirmacion.
   Click en el link para activar la cuenta.
5. **Redireccion automatica** a `/inicio` (pantalla principal)

### Que pasa despues

- La sesion se inicializa con cifrado E2E automaticamente
- Si hay un claim token en la URL, se muestra un banner verde:
  "Evidencia guardada en tu cuenta: [nombre]"
- Opcionalmente, 1-2 minutos despues llega un email "Founder Badge"

### Alternativa: modo invitado

- Click en "Probar sin cuenta" → acceso a `/inicio?guest=true`
- Funcionalidad limitada, datos en almacenamiento local

---

## Flujo 2: Pantalla principal (Dashboard)

**Ruta:** `/inicio`

### Que ve el usuario

Fondo con gradiente blanco-cyan-azul. Titulo grande:
**"Tu centro de firma y proteccion legal"**.
Debajo, 4 botones de accion:

| Boton | Que hace |
|-------|----------|
| **Proteger Documento** (negro) | Abre Centro Legal en modo certificacion |
| **Firmar un Documento** (borde) | Abre Centro Legal en modo firma |
| **Crear Flujo de Firmas** (borde) | Abre Centro Legal en modo workflow |
| **Enviar NDA** (borde) | Abre Centro Legal en modo NDA |

Debajo de los botones, 4 tarjetas informativas explican cada accion.

En el header superior hay un boton **"Centro Legal"** que abre el modal
en modo por defecto (certificacion).

### Paso a paso

1. **Click en cualquiera de los 4 botones** → Se abre el modal Centro Legal
   con la accion correspondiente preseleccionada.

---

## Flujo 3: Proteger un documento

**Se abre desde:** Dashboard → "Proteger Documento"
**Modal:** Centro Legal (LegalCenterModalV2)

### Que ve el usuario

Modal con overlay oscuro. Tres columnas:

- **Izquierda:** Toggles de accion
  - "Proteger documento" (activado por defecto)
  - "Mis firmas" (desactivado)
  - "Flujo de firmas" (desactivado)
  - "Enviar NDA" (desactivado)
  - Icono de info → explica TSA / Polygon / Bitcoin
- **Centro:** Zona de carga de archivo
  - Borde punteado: "Arrastra tu documento o hace clic para elegirlo"
  - Formatos aceptados (ver seccion "Formatos soportados" abajo)
- **Derecha:** Vista previa del documento (aparece al subir)

### Formatos soportados

No solo PDF. El sistema acepta multiples formatos y los convierte
automaticamente en el navegador (sin enviar nada al servidor):

| Formato | Que pasa al subirlo |
|---------|---------------------|
| **PDF** | Se usa directo, sin conversion |
| **JPEG / JPG** | Se convierte a PDF automaticamente. Se corrige la rotacion EXIF (fotos de celular quedan derechas) |
| **PNG** | Se convierte a PDF, preservando transparencia |
| **TXT** | Se envuelve en paginas A4 (tipografia legible, 11-12 lineas por pagina) |

La conversion es 100% local — el archivo original nunca sale del navegador.
El usuario ve el resultado convertido en la vista previa a la derecha.

### Paso a paso

1. **Arrastrar archivo** al centro del modal (o click para seleccionar)
   - Si no es PDF, se convierte automaticamente en el navegador
2. **El documento se carga** y aparece la vista previa a la derecha
3. **Revisar opciones de proteccion** (click en icono info para ver detalle):
   - TSA (timestamp legal RFC 3161) — activado
   - Polygon (anclaje blockchain rapido) — activado
   - Bitcoin (anclaje blockchain permanente) — activado
4. **Click "Continuar"**
5. **Pantalla de resumen** muestra las acciones configuradas con checkmarks verdes
6. **Click "Guardar documento"**
7. **Indicadores de progreso** muestran: TSA → Polygon → Bitcoin
8. **Documento protegido** — aparece en `/documentos` con badge de proteccion

### Que pasa por detras (sin que el usuario lo vea)

1. Se calcula el hash SHA-256 del archivo original en el navegador
2. Se genera una clave de cifrado AES-256-GCM unica (en el navegador)
3. El archivo se cifra con esa clave (en el navegador)
4. Solo los bytes cifrados se suben al servidor
5. El servidor NUNCA ve el contenido — solo recibe un blob opaco
6. La clave queda asociada a la cuenta del usuario

### Que obtiene el usuario

- Documento con timestamp legal verificable
- Anclaje en blockchain Polygon (confirmacion en segundos)
- Anclaje en blockchain Bitcoin (confirmacion en horas, permanencia maxima)
- Archivo .ECO descargable con toda la evidencia

---

## Flujo 4: Firmar un documento (firma propia)

**Se abre desde:** Dashboard → "Firmar un Documento"
**Modal:** Centro Legal con `initialAction='sign'`

### Que ve el usuario

Mismo layout de 3 columnas. Toggle "Mis firmas" activado por defecto.
En la columna izquierda aparecen 3 tabs de metodo de firma:

| Tab | Que ve |
|-----|--------|
| **Dibujar** | Canvas para dibujar firma con el mouse/dedo |
| **Escribir** | Campo de texto que auto-genera una firma tipografica |
| **Subir** | Selector de archivo para subir imagen de firma |

### Paso a paso

1. **Subir documento** (PDF, imagen o texto — se convierte automaticamente)
2. **Elegir metodo de firma:**
   - **Dibujar:** Aparece un canvas. Dibujar la firma. Click "Guardar Firma".
   - **Escribir:** Escribir nombre. Se genera firma tipografica automaticamente.
   - **Subir:** Seleccionar imagen de firma existente.
3. **Colocar firma en el documento** — Click en el documento para posicionar.
   La firma aparece como elemento flotante, arrastrable.
4. **Ajustar posicion** — Arrastrar la firma al lugar deseado.
   Se puede eliminar y volver a colocar.
5. **Rotar el documento** (si necesario) — Botones de rotacion en la barra.
   La firma se reposiciona automaticamente al rotar (las coordenadas se
   transforman para mantener la ubicacion correcta).
6. **Click "Continuar"** → Pantalla de resumen
7. **Click "Guardar documento"** → Firma registrada con evidencia

### Que obtiene el usuario

- Documento con firma visual posicionada
- Evidencia forense de la firma (timestamp + coordenadas normalizadas)
- Archivo .ECO con la firma incluida

---

## Flujo 5: Crear flujo de firmas (multi-firmante)

**Se abre desde:** Dashboard → "Crear Flujo de Firmas"
**Modal:** Centro Legal con `initialAction='workflow'`

### Que ve el usuario

Columna izquierda muestra panel de "Firmantes":
- Lista numerada de firmantes (1, 2, 3...)
- Campo de email para cada firmante
- Boton "+ Agregar firmante" (borde punteado)
- Boton X para eliminar firmante
- Texto informativo: "Los firmantes recibiran un email con link seguro y OTP..."

### Paso a paso

1. **Subir documento** (PDF, imagen o texto)

2. **Agregar firmantes** — Tres formas:

   **Forma 1: Manual**
   - Escribir email del primer firmante
   - Click "+ Agregar firmante" para cada firmante adicional

   **Forma 2: Smart Paste (carga masiva)**
   - Copiar una lista de emails desde cualquier fuente (Excel, Gmail, texto)
   - Poner el cursor en el primer campo de email
   - Pegar (Ctrl+V / Cmd+V)
   - El sistema detecta automaticamente todos los emails en el texto pegado
   - Crea un firmante por cada email encontrado
   - Emails duplicados se ignoran silenciosamente
   - El orden de firma se asigna automaticamente (1, 2, 3...)
   - Ejemplo: pegar "juan@mail.com, maria@mail.com, pedro@mail.com"
     → se crean 3 firmantes en orden

   **Forma 3: Escribir varios separados por coma**
   - Funciona igual que Smart Paste pero escribiendo directo

3. **Eliminar firmante** — Click X al lado de cualquier firmante.
   El orden se renumera automaticamente.

4. **Click "Continuar"**

5. **Wizard de campos de firma (automatico)**

   El sistema reconoce la cantidad de firmantes y crea los campos de firma
   automaticamente, sin que el usuario tenga que arrastrar nada:

   - **Calculo automatico:** El Wizard genera un bloque de firma (220x64 px)
     para cada firmante, posicionado en la parte inferior derecha del documento
   - **Distribucion inteligente:** Si hay 2 firmantes, 2 columnas lado a lado.
     Si hay 4, se apilan en filas. El sistema ajusta segun el espacio disponible.
   - **Campos generados por firmante:**
     - Campo de firma (obligatorio) — donde va la firma visual
     - Campo de nombre (opcional) — se autocompleta con el nombre del firmante
     - Campo de fecha (opcional) — se autocompleta con la fecha de firma
   - **Cada campo esta asignado** a un firmante especifico (por email) —
     no hay forma de que un firmante firme en el campo de otro
   - **Anti-duplicacion:** Cada campo tiene un ID unico y regla de
     "una sola vez por pagina" para evitar firmas duplicadas

   **Ajuste manual (opcional):**
   - Si el usuario quiere mover los campos, puede entrar en modo de
     vista previa a pantalla completa
   - Los campos son arrastrables sobre el documento
   - La rotacion del documento reposiciona los campos automaticamente
     (transformacion de coordenadas con matriz de rotacion)
   - Los campos no pueden salir de los limites de la pagina (clipping automatico)

6. **Click "Continuar"** → Pantalla de resumen

7. **Click "Enviar a firmar"**

### Que pasa con el cifrado (zero-knowledge)

Para cada firmante, el sistema:
1. Genera un OTP (One-Time Pad) unico por firmante
2. Deriva una clave de cifrado a partir del OTP (PBKDF2)
3. "Envuelve" la clave del documento con la clave del firmante (AES Key Wrapping)
4. Solo la clave envuelta se guarda en el servidor — la clave original
   nunca sale del navegador del owner

Cuando el firmante accede con su token + OTP, su navegador:
1. Reconstruye la clave de cifrado a partir del OTP
2. Desenvuelve la clave del documento
3. Descifra el documento localmente
4. El servidor NUNCA ve el contenido del documento

### Que pasa despues

- Workflow se crea con status `active`
- Primer firmante recibe email con link seguro
- Cada firmante firma en orden (el siguiente recibe email cuando el anterior termina)
- El owner puede seguir el progreso en `/dashboard/workflows`

---

## Flujo 6: Enviar NDA

**Se abre desde:** Dashboard → "Enviar NDA"
**Modal:** Centro Legal con `initialAction='nda'`

### Que ve el usuario

Toggle "Enviar NDA" activado. En la columna izquierda aparece:
- Area de texto con template de NDA por defecto (editable)
- Contador de palabras
- Opcion "Cargar desde archivo" para subir NDA propio

### Paso a paso

1. **Subir documento** a compartir bajo NDA (PDF, imagen o texto)
2. **Revisar/editar texto del NDA** en el panel izquierdo
   - O subir archivo de NDA personalizado
3. **Click "Continuar"**
4. **Agregar firmantes** (mismo panel que flujo de firmas, con Smart Paste)
5. **Click "Continuar"** → Resumen
6. **Click "Enviar NDA"**

### Que pasa despues

- Firmantes reciben email con link al NDA
- Deben aceptar el NDA ANTES de ver el documento
- La aceptacion queda registrada con IP, timestamp y ubicacion

---

## Flujo 7: Experiencia del firmante invitado

**App:** app.ecosign.app (interfaz minima)
**Ruta:** `/sign/:token`

### Que ve el firmante

Interfaz limpia y enfocada, sin distracciones. Solo el flujo de firma.
No necesita cuenta. No necesita instalar nada.

### Paso a paso

**Paso 1: Validacion del link**
- Pantalla de carga: "Validando link de firma..."
- El sistema verifica el token automaticamente

**Paso 2: Confirmar identidad (PreAccess)**
- Titulo: "Confirmar identidad para ver el documento"
- Informacion del documento y del remitente
- Campos a completar:
  - Nombre
  - Apellido
- Dos checkboxes obligatorios:
  - "Confirmo que soy el destinatario de este documento"
  - "Acepto que se registre mi acceso..."
- **Click "Continuar"** (se habilita cuando todo esta completo)
- Opcion: "Rechazar documento" (cancela el flujo)

**Paso 3: Aceptar NDA (si fue configurado)**
- Titulo: "Acuerdo de Confidencialidad"
- Texto del NDA en area scrolleable
- Indicacion: "Desplazate hasta el final para continuar"
- El checkbox se habilita SOLO despues de scrollear hasta el final
- Marcar checkbox → se habilita "Continuar"
- Aviso de seguridad: "Este NDA queda registrado con tu IP, ubicacion y timestamp..."
- **Click "Continuar"**

**Paso 4: Verificacion OTP (si fue configurado)**
- Se envia codigo por SMS o email
- Ingresar codigo de 6 digitos
- **Click "Verificar"**

**Paso 5: Ver el documento**
- El documento se descifra en el navegador del firmante (zero-knowledge:
  el servidor entrega bytes cifrados, el navegador los descifra con
  la clave derivada del OTP del firmante)
- Visor PDF a pantalla completa
- Controles: zoom, navegacion de paginas
- **Click "Continuar"** para avanzar a la firma
- Opcion: "Rechazar documento"

**Paso 6: Firmar**
- Elegir metodo de firma:
  - **Dibujar:** Canvas para firma manual
  - **Escribir:** Campo de texto con firma tipografica
  - **Subir:** Subir imagen de firma
- Colocar firma en el documento (click en la pagina)
- Ver preview de la ubicacion
- **Click "Firmar"** para confirmar

**Paso 7: Completado**
- Checkmark verde + "Firma completada!"
- Mensaje: "Con tu firma se completo el flujo..." o "El documento fue firmado correctamente"
- Dos botones de descarga:
  - **"Descargar copia fiel (PDF)"** (boton negro, principal)
  - **"Descargar evidencia (.ECO)"** (boton con borde)
- Mensaje: "Guarda tu PDF firmado y tu archivo .ECO ahora. Son tu evidencia oficial."
- Si hay opcion de crear cuenta:
  - "Queres conservar esta evidencia?"
  - Link: "Crear cuenta y guardar evidencia"

---

## Flujo 8: Gestionar documentos

**Ruta:** `/documentos`

### Que ve el usuario

Lista de todos los documentos protegidos. Cada documento muestra:
- Nombre del archivo
- Badge de status: Protected, Signed, Pending, etc.
- Fecha de creacion
- Ultimo evento
- Iconos de nivel de proteccion (TSA, Polygon, Bitcoin)
- Menu de acciones (tres puntos)

### Acciones disponibles

| Accion | Que hace |
|--------|----------|
| **Ver** | Abre preview del documento + metadata |
| **Descargar PDF** | Descarga el PDF firmado/protegido |
| **Descargar ECO** | Descarga el certificado de evidencia |
| **Compartir** | Genera link compartible |
| **Mover a operacion** | Organiza el documento en una operacion |
| **Eliminar** | Elimina el documento |

---

## Flujo 9: Seguir workflows y rastrear descargas

**Ruta:** `/dashboard/workflows`

### Que ve el usuario

- Tarjetas de estadisticas: Total | Activos | Completados | Total Firmas
- Lista de workflows con:
  - Titulo
  - Status: Draft, Ready, Active, Completed
  - Progreso de firmantes: "2/3 firmaron"
  - Fecha de expiracion
  - Menu de acciones

### Click en un workflow → Detalle

**Ruta:** `/dashboard/workflows/:id`

Vista completa del workflow con informacion por cada firmante:

#### Panel de firmantes

Para cada firmante se muestra:

| Dato | Que ve el owner |
|------|-----------------|
| **Email** | Email del firmante |
| **Nombre** | Nombre ingresado por el firmante al acceder |
| **Status** | invited / accessed / verified / ready_to_sign / signed |
| **Fecha de firma** | Timestamp exacto (si firmo) |
| **PDF descargado** | Checkmark "descargado" o advertencia "sin descargar" |
| **ECO descargado** | Checkmark "descargado" o advertencia "sin descargar" |

#### Rastreo de descargas

El sistema registra si cada firmante descargo su PDF y/o su evidencia
.ECO al finalizar el flujo. Esto le permite al owner:

- **Detectar firmantes que no descargaron** — Si un firmante firmo
  pero no descargo su PDF o ECO, el owner lo ve inmediatamente
  con el icono de advertencia "sin descargar".
- **Reenviar acceso** — Boton "Reenviar acceso de recuperacion"
  genera un nuevo link seguro y lo copia al portapapeles para
  que el owner se lo envie al firmante.
- **Descargar por el firmante** — El owner puede descargar el PDF
  firmado o el ECO de cualquier firmante y enviarselo directamente.
  Los archivos se nombran `{documento} - {email}.pdf` y
  `{documento} - {email}.eco.json`.

Esto le permite al owner dar un mejor servicio: si un agente
inmobiliario no descargo su copia, el broker puede enviarsela.

#### Audit trail (registro forense)

Debajo del panel de firmantes, seccion de audit trail con todos
los eventos ECOX ordenados cronologicamente:
- Tipo de evento
- Timestamp
- ID del firmante
- Detalles (JSON expandible)

---

## Flujo 10: Verificar un documento (publico)

**Ruta:** `/verify`
**Acceso:** Publico, sin cuenta

### Que ve el usuario

Pagina con titulo "Verificador" y descripcion:
"Comproba la autenticidad de tu documento..."

Zona de carga: "Arrastra tu .ECO o PDF"

### Paso a paso

1. **Subir archivo .ECO** (o PDF + .ECO)
2. **Verificacion automatica** corre en el navegador (100% local, el
   archivo no se sube a ningun servidor)
3. **Resultados en dos vistas:**

#### Vista narrativa (historia humana)

El verificador muestra una linea de tiempo con lenguaje claro:

| Hito | Ejemplo de lo que muestra |
|------|---------------------------|
| **Documento preparado** | "El documento fue registrado el 15 de marzo a las 14:32" |
| **Proteccion registrada** | "Se aplico timestamp legal (TSA) antes de cualquier firma" |
| **Firmas** | "3 personas firmaron este documento" |
| **Proteccion adicional** | "Se registro anclaje en blockchain Polygon (tx: 0xabc...)" |

Cada hito tiene titulo en lenguaje simple, descripcion de 1-2 lineas,
y timestamp local con tooltip UTC.

Si hubo NDA, se muestra en seccion separada: "Aceptaciones de NDA".

#### Resumen de confianza

4 tarjetas resumen:
- **Integridad:** "Confirmada" o "No verificable"
- **Momento de proteccion:** "Registrado" o "No visible"
- **Proteccion adicional:** "Presente" / "Pendiente" / "No registrada"
- **Firmas:** "3 registradas" o "No registra firmas"

#### Vista tecnica (forense)

Boton toggle: **"Ver detalle tecnico (forense)"** — expande la lista
cruda de eventos con:
- Label (descripcion humana)
- Kind (codigo de evento)
- Timestamp ISO
- Details (payload JSON)

Para auditores, peritos o abogados que necesitan el detalle criptografico.

#### Privacidad

- "EcoSign no ve el contenido del documento"
- La verificacion corre 100% local en el navegador
- Solo la persona con el documento + .ECO puede verificar
- Los anclajes blockchain se verifican contra la red publica

### Lo importante

- Cualquier persona puede verificar sin tener cuenta
- No se necesita confiar en EcoSign: la evidencia es verificable
  de forma independiente contra blockchains publicas
- Si falta alguna evidencia esperada se muestra warning, no error

---

## Flujo 11: Aceptar NDA (pagina publica)

**Ruta:** `/nda/:token`
**Acceso:** Publico, por token

### Que ve el usuario

- Texto completo del NDA en area scrolleable
- Indicacion de scrollear hasta el final
- Checkbox de aceptacion (se habilita al llegar al final)
- Boton "Acepto y continuo"

### Paso a paso

1. **Leer el NDA completo** (scrollear hasta el final)
2. **Marcar checkbox** de aceptacion
3. **Click "Acepto y continuo"**
4. **Redireccion** al documento o workflow correspondiente

---

## Herramientas destacadas

### Smart Paste (carga masiva de firmantes)

Disponible en: Flujo 5 (workflow) y Flujo 6 (NDA)

**Como funciona:**
1. Copiar emails desde cualquier fuente (Excel, Gmail, Outlook, texto plano)
2. Poner el cursor en el campo de email del primer firmante
3. Pegar (Ctrl+V / Cmd+V)
4. El sistema extrae todos los emails validos del texto pegado
5. Crea un firmante por cada email encontrado
6. Emails duplicados se ignoran automaticamente
7. El orden de firma se asigna en el orden en que aparecen

**Ejemplo:** Pegar `"Juan <juan@mail.com>, maria@mail.com; pedro@mail.com"`
→ Se crean 3 firmantes: juan@mail.com (#1), maria@mail.com (#2), pedro@mail.com (#3)

### Wizard de campos de firma (automatico)

Disponible en: Flujo 5 (workflow)

**Como funciona:**
- Al avanzar del paso de firmantes al paso de campos, el Wizard detecta
  cuantos firmantes hay y genera automaticamente:
  - Un bloque de firma por firmante (220x64 px)
  - Campos opcionales de nombre y fecha
  - Distribucion automatica en la parte inferior del documento
- Los campos estan asignados por email: el firmante 1 solo puede firmar
  en su campo, nunca en el del firmante 2
- Si el usuario quiere ajustar, puede arrastrar campos en modo pantalla completa
- No hay riesgo de conflicto: cada campo tiene ID unico y regla anti-duplicacion

### Rotacion de documento

Disponible en: Flujo 4 (firma), Flujo 5 (workflow)

**Como funciona:**
- Botones de rotacion en la barra de herramientas (0, 90, 180, 270 grados)
- El documento rota visualmente en tiempo real
- Los campos de firma se reposicionan automaticamente al rotar
  (transformacion de coordenadas con matriz de rotacion)
- Las coordenadas guardadas siempre se mapean a la orientacion base del documento
- Fotos subidas desde celular se auto-corrigen (rotacion EXIF)

### Formatos soportados

Disponible en: Todos los flujos de carga de documento

| Formato | Conversion | Detalle |
|---------|-----------|---------|
| **PDF** | Ninguna | Se usa directo |
| **JPEG/JPG** | → PDF | Correccion automatica de rotacion EXIF |
| **PNG** | → PDF | Preserva transparencia |
| **TXT** | → PDF | Paginas A4, tipografia legible |

Toda conversion es local (en el navegador). El archivo original nunca
sale del dispositivo.

---

## Seguridad: Zero-Knowledge (server-side blind)

### Que significa

El servidor de EcoSign **nunca ve el contenido** de los documentos.
Esto no es una politica — es una garantia tecnica. El servidor
fisicamente no puede descifrar los archivos porque no tiene la clave.

### Como funciona

**Al proteger/subir:**
1. El navegador genera una clave AES-256-GCM unica (Web Crypto API)
2. El navegador cifra el documento con esa clave
3. Solo los bytes cifrados se suben al servidor
4. La clave queda en el navegador del usuario, nunca se envia

**Al compartir con firmantes:**
1. Para cada firmante se genera un OTP (One-Time Pad) unico
2. Se deriva una clave de cifrado del OTP (PBKDF2)
3. La clave del documento se "envuelve" con la clave del firmante (AES Key Wrapping)
4. Solo la clave envuelta se guarda en el servidor
5. Cuando el firmante accede, su navegador reconstruye la clave y descifra localmente

**Al verificar:**
1. La verificacion corre 100% en el navegador
2. El archivo no se sube a ningun servidor
3. Los anclajes blockchain se verifican contra redes publicas

### Que ve el servidor

| Dato | Ve el servidor? |
|------|-----------------|
| Contenido del documento | **NO** (solo bytes cifrados) |
| Nombre real del archivo | **NO** (se sanitiza y reemplaza por UUID) |
| Tipo de contenido | **NO** (todo es `application/octet-stream`) |
| Hash del documento | SI (para verificacion, pero hash != contenido) |
| Metadatos de firma | SI (quien firmo, cuando, desde donde) |
| Eventos de auditoria | SI (timeline de acciones, sin contenido) |

### Por que importa

- Mayor privacidad: ni EcoSign ni su proveedor de nube pueden leer documentos
- Compliance: los datos sensibles nunca salen del dispositivo del usuario
- Independencia: si EcoSign desaparece, el usuario conserva su .ECO
  y puede verificar la evidencia contra blockchains publicas

---

## Resumen de rutas

| Ruta | Pagina | Acceso |
|------|--------|--------|
| `/login` | Login / Signup | Publico |
| `/inicio` | Dashboard principal | Autenticado |
| `/documentos` | Mis documentos | Autenticado |
| `/dashboard/workflows` | Mis workflows | Autenticado |
| `/dashboard/workflows/:id` | Detalle de workflow | Autenticado |
| `/verify` | Verificador publico | Publico |
| `/verificador` | Verificador (dashboard) | Autenticado |
| `/sign/:token` | Firma de invitado | Publico (token) |
| `/nda/:token` | Aceptacion de NDA | Publico (token) |
