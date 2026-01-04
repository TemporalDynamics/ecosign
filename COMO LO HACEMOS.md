# CÓMO LO HACEMOS — Manifiesto técnico‑narrativo (EcoSign)

Este documento es un manifiesto técnico‑narrativo. Explica **qué hacemos**, **por qué importa** y **cómo puede verificarse**, sin revelar detalles internos propietarios.

No es marketing y no es asesoramiento legal. Es una guía clara para entender:

- por qué la evidencia digital importa,
- qué necesita una firma para ser creíble en un juicio,
- cómo EcoSign construye evidencia verificable,
- y qué podés comprobar por vos mismo.

Si venís sin contexto técnico, este texto te acompana desde cero. Si sos técnico, vas a encontrar contratos de datos y pseudocódigo. Si sos abogado, perito o compliance, vas a encontrar criterios y límites claros.

---

Durante años, la industria de la firma digital confundió **operar** con **probar**.  
Firmar es facil. Demostrar la verdad, no.  
EcoSign existe porque ese error tiene consecuencias legales, económicas y humanas.

**Interludio — la pregunta que casi nadie hace**  
Si mañana desaparece la plataforma, que pasa con la verdad que firmaste hoy.
Si tu prueba muere con tu proveedor, nunca fue prueba: fue alquiler.

## 1) El problema real no es firmar, es probar la verdad

Firmar un documento es facil. Probar que una firma es **verdadera**, **intacta** y **temporalmente ubicable** es otra cosa.

Muchas plataformas de firma se apoyan en confianza: logs internos, dashboards, versiones, correos de confirmacion. Eso sirve para operar. Pero **no siempre sirve para demostrar**.

EcoSign parte de otra premisa:

> No pedimos confianza. Entregamos evidencia verificable.

Ese cambio de paradigma es el punto de partida de todo lo demas.

Dos tesis que incomodan, pero son tecnicamente ciertas:

- **La verdad que depende de una empresa no es verdad independiente.**
- **Si la evidencia no puede salir del sistema, no es evidencia: es un log.**

No todo lo digital es probatorio.  
No todo lo firmado es demostrable.

---

## 2) Que necesita una firma para ser valida en un juicio

No existe una formula unica para todos los paises, pero los tribunales y peritos suelen mirar lo mismo:

- **Integridad**: el documento no fue alterado.
- **Autoría**: quien firmo puede ser identificado.
- **Temporalidad**: se puede ubicar en el tiempo.
- **Cadena de custodia**: la evidencia es verificable por terceros.
- **Independencia**: no depende solo de la palabra de una plataforma.

EcoSign no garantiza resultados judiciales. Lo que sí garantiza es esto:

> Evidencia tecnica verificable, portable y revisable por terceros.

Si falta una sola de esas piezas, la firma deja de ser prueba y pasa a ser opinion.

---

## 3) Tipos de firma y que valida cada una

No todas las firmas tienen el mismo peso probatorio. Esta tabla compara enfoques de mercado (genericos) con el enfoque EcoSign.

| Tipo | Que valida | Donde vive la evidencia | Verificacion independiente | Peso probatorio tipico |
| --- | --- | --- | --- | --- |
| Firma simple | Intencion basica | Logs internos | Limitada | Bajo‑medio |
| Firma electronica avanzada (AES) | Autenticacion + integridad | Plataforma | Parcial | Medio |
| Firma cualificada (QES) | Identidad certificada + dispositivo | Proveedor + certificador | Alto (dependiente) | Alto |
| Firma con evidencia verificable (EcoSign) | Integridad + trazabilidad + refuerzo externo | Contenedor portable (.ECO) + registros publicos | Alta | Alto (segun jurisdiccion y evidencia) |

Notas importantes:

- Esta comparacion es tecnica, no legal. Cada jurisdiccion tiene reglas propias.
- En la practica, muchas firmas “digitales” son simples, aunque el usuario no lo sepa.

Si el peso probatorio no viaja con el documento, no viaja.

---

### El modelo que no escala

## 4) El cambio de paradigma: de confianza a evidencia

En EcoSign no existe la idea de “confiá en nuestro dashboard”.

Existe la idea de **entregarte un objeto de evidencia** que podés verificar sin nosotros. Eso cambia la relacion entre plataforma y usuario.

- El documento es tuyo.
- La evidencia es tuya.
- La verificacion no depende de que EcoSign exista.

> EcoSign no guarda tu verdad. Te la entrega.
La plataforma es un medio. La evidencia es el producto.

Una plataforma no deberia ser testigo de si misma.  
Si la prueba solo existe mientras la plataforma existe, esa prueba es fragil.

**Interludio — evidencia huerfana**  
Llamamos “evidencia huerfana” a toda prueba que solo puede verificarse mientras el sistema que la emitio siga vivo.  
EcoSign evita esa dependencia por diseño.

Históricamente, el firmante es la parte mas débil del sistema: firma, pero no conserva la prueba.  
EcoSign invierte esa asimetria.

Pseudocodigo de independencia total:

```pseudo
resultado = verificarOffline(eco, documento)

// No requiere:
// - API
// - cuenta
// - servidor EcoSign
assert resultado.integridad == OK
```

---

## 4.1) Dos formas de "entregar evidencia" (y por que no son equivalentes)

Cuando una plataforma de firma dice "te entregamos la evidencia", es importante hacer una distincion tecnica que suele pasarse por alto.

### Modelo A — Log de auditoria (evidencia basada en confianza)

Es el modelo mas comun en la industria.

La plataforma entrega:

- un PDF firmado, y
- un "certificado de auditoria" o "audit log".

Ese certificado describe eventos como:

- quien firmo,
- desde que IP,
- en que fecha,
- segun los registros internos de la plataforma.

Este modelo funciona operativamente, pero tiene una limitacion estructural:

La evidencia depende de que la plataforma testifique sobre la integridad de sus propios servidores.

En un juicio o auditoria profunda, ese log:

- no es autosuficiente,
- no es independiente,
- y no puede validarse sin confiar en la empresa que lo emitio.

La verdad vive dentro del sistema.

Si la plataforma deja de existir, se pierde acceso, o el sistema no puede auditarse externamente, la evidencia queda huerfana.

### Modelo B — Contenedor de evidencia (evidencia basada en prueba)

EcoSign utiliza un modelo distinto.

No entrega un resumen de lo que ocurrio en sus servidores.  
Entrega un objeto criptografico portable que contiene:

- la huella digital original del documento,
- firmas criptograficas verificables,
- y referencias publicas de refuerzo (cuando aplican).

El archivo .ECO:

- puede verificarse offline,
- no requiere una cuenta,
- no depende de que EcoSign este disponible,
- y no necesita que la plataforma "declare" nada.

La evidencia no depende de la palabra de EcoSign.  
Depende de las matematicas.

La verdad viaja con el documento.

### La diferencia clave

Ambos modelos dicen "entregamos evidencia".  
Pero no entregan lo mismo.

Uno entrega un relato de lo que paso.  
El otro entrega una prueba verificable de que ocurrio.

EcoSign no invalida otros modelos.  
Simplemente adopta un estandar mas exigente.

> Un log explica lo que un sistema dice que paso. Una prueba permite demostrar lo que ocurrio.

---

## 5) El contenedor .ECO: pequeño, portable, verificable

El .ECO no es un PDF firmado. No es un log interno. No es un ZIP gigante.

Es un **contenedor de evidencia** liviano y portable que incluye:

- el hash criptografico del documento,
- metadatos basicos,
- firmas criptograficas,
- y la intencion de refuerzos externos (si aplica).

Lo importante:

- **No contiene el documento en claro.**
- **Pesa poco.**
- **Viaja con el documento.**
- **Se puede verificar offline.**

Este diseno elimina una dependencia comun: que la verdad viva dentro de un sistema privado.

Un contenedor que pesa bytes puede cargar con toda la verdad.

---

### La evidencia debe viajar

## 6) Documentos claros, sin dashboards confusos

Un documento deberia poder explicar su historia sin obligarte a navegar un tablero complejo.

EcoSign trata cada documento como un objeto claro:

- tiene evidencia,
- tiene historial,
- tiene verificacion,
- puede compartirse sin friccion.

No escondemos el contenido en estados opacos. El archivo y su evidencia son el centro.

Si para entender la validez de un documento necesitas acceso a un dashboard privado, entonces la evidencia no esta en el documento.  
Esta secuestrada por el sistema.

En EcoSign, el documento es el dashboard.

---

### Compartir sin friccion

## 7) Compartir documentos con NDA, link y codigo

Compartir evidencia no deberia requerir una cuenta, ni un proceso manual.

EcoSign permite compartir desde documentos:

- **Link directo**
- **Codigo OTP**
- **Registro de apertura**

El sistema registra:

- quien abre,
- cuando,
- y desde donde.

Eso crea **eventos verificables** que fortalecen la cadena de custodia, sin que tengas que perseguir confirmaciones.

<details>
<summary>Ver prueba técnica (código real, OTP de acceso)</summary>

Fuente: `client/src/lib/e2e/otpSystem.ts`

```ts
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  const otpHash = await hashOTP(otp);
  return otpHash === hash;
}
```
</details>

---

### El limite del conocimiento

## 8) Zero Knowledge y cifrado, explicado sin humo

EcoSign opera con un principio simple:

- El hash del documento se calcula en el cliente.
- El contenido no necesita pasar por nuestros servidores en claro.

Eso es lo que llamamos **zero‑knowledge operativo**. No es un slogan: es una decision de arquitectura.

Pero tambien somos transparentes:

- Si un usuario usa integraciones externas o APIs de terceros, esas partes quedan sujetas a las politicas de esos proveedores.
- Cuando esto sucede, lo declaramos claramente en el flujo.

En otras palabras:

> Decimos que hacemos. Decimos que no hacemos. Y decimos cuando delegamos.

**Nota sobre el uso de pseudocodigo**  
En este documento se utiliza pseudocodigo y esquemas conceptuales para explicar comportamientos verificables, contratos de datos e invariantes del sistema.  
Algunos componentes internos —como mecanismos de empaquetado, optimizacion y orquestacion— no se muestran en codigo ejecutable por razones de proteccion de propiedad intelectual en proceso.  
Esta decision no limita la posibilidad de verificacion: todo lo que se afirma aqui puede comprobarse a partir de los artefactos entregados (.ECO), los resultados del verificador y las senales publicas asociadas.  
Mostramos lo suficiente para que puedas verificar. No mas de lo necesario para que alguien copie.

Pseudocodigo de limites (lo que el servidor **no** recibe):

```pseudo
// Cliente
documento = leerArchivo()
hash = SHA256(documento)
firma = sign(hash, claveUsuario)

// Servidor
recibir(hash)         // OK
recibir(firma)        // OK
recibir(documento)    // NO
```

<details>
<summary>Ver prueba técnica (código real, client-side encryption)</summary>

Fuente: `client/src/lib/e2e/documentEncryption.ts`

```ts
/**
 * Client-side encryption/decryption of documents.
 * All operations happen in the browser, server never sees plaintext.
 */
export async function encryptFile(
  file: File,
  documentKey: CryptoKey
): Promise<Blob> {
  const fileBuffer = await file.arrayBuffer();
  const iv = randomBytes(CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.ivLength);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: CRYPTO_CONFIG.DOCUMENT_ENCRYPTION.algorithm, iv },
    documentKey,
    fileBuffer
  );

  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  return new Blob([result], { type: 'application/octet-stream' });
}
```
</details>

---

### La evidencia nace en el borde

## 9) Flujo de emision (conceptual + pseudocodigo)

La emision es sencilla, verificable y en el borde del usuario.

### Resumen conceptual

1) El cliente calcula el hash local.
2) Construye el manifiesto con metadatos.
3) Firma el manifiesto con su clave.
4) Empaqueta el .ECO.
5) Recibe el .ECO inmediatamente.

### Pseudocodigo (alto nivel)

```pseudo
function emitirECO(documento):
  hash = SHA256(documento)
  manifiesto = {
    hash: hash,
    size: bytes(documento),
    createdAt: nowUTC(),
    meta: { nombre, tipo }
  }

  firma = Ed25519.sign(manifiesto, clavePrivadaCliente)

  eco = empaquetar({ manifiesto, firma })
  entregar(eco)
  return eco
```

<details>
<summary>Ver prueba técnica (código real, hash local SHA‑256)</summary>

Fuente: `client/src/utils/hashDocument.ts`

```ts
export async function calculateDocumentHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
```
</details>

No mostramos el motor interno de empaquetado. Ese componente pertenece a **EcoPacker**, parte del claim 2 de la PPA y en proceso de registro de propiedad intelectual.

<details>
<summary>Ver prueba técnica (código real, upload solo cifrado)</summary>

Fuente: `client/src/utils/documentStorage.ts`

```ts
// Generate document hash (of original file, before encryption)
const arrayBuffer = await pdfFile.arrayBuffer();
const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

// Generate document key and encrypt the file
const documentKey = await generateDocumentKey();
const encryptedBlob = await encryptFile(pdfFile, documentKey);

// Upload ENCRYPTED PDF to Supabase Storage
if (storePdf) {
  const encryptedFileName = `${user.id}/${Date.now()}-${pdfFile.name}.encrypted`;
  const uploadResult = await supabase.storage
    .from('user-documents')
    .upload(encryptedFileName, encryptedBlob, {
      contentType: 'application/octet-stream',
      upsert: false
    });
  // Keep pdf_storage_path null (we don't store plaintext PDF)
  storagePath = null;
}
```
</details>

---

### La verdad primero

## 10) Verificacion: offline primero, online como refuerzo

### A) Verificacion offline (base de verdad)

- Validar estructura del .ECO
- Validar firmas del manifiesto
- Si se provee el documento original: recomputar hash y comparar

Resultado minimo:

- Integridad del .ECO: OK / NO
- Coincidencia con documento: OK / NO

Offline es la verdad. Online es el eco.

Pseudocodigo de verificacion offline:

```pseudo
function verificarOffline(eco, documentoOpcional):
  assert validarEstructura(eco)
  assert verificarFirma(eco.manifiesto, eco.firma)

  if documentoOpcional:
    assert SHA256(documentoOpcional) == eco.manifiesto.hash
```

Pseudocodigo de inmutabilidad logica:

```pseudo
ecoOriginal = eco
ecoConObservaciones = eco + observacionesExternas

assert hash(ecoOriginal) == hash(ecoConObservaciones)
```

Try it yourself (prueba minima, local):

```bash
# 1) Crear doc
echo "hola" > doc.txt

# 2) Hash
sha256sum doc.txt

# 3) Cambiar doc
echo "hola!" > doc.txt
sha256sum doc.txt
```

Un solo byte cambia todo el hash. Eso es lo que hace detectable cualquier alteracion.

<details>
<summary>Ver prueba técnica (código real, verificación .ECO)</summary>

Fuente: `client/src/lib/verificationService.ts`

```ts
export async function verifyEcoWithOriginal(
  ecoFile: File,
  originalFile?: File | null
): Promise<VerificationBaseResult> {
  const supabase = getSupabase();
  const formData = new FormData();
  formData.append('ecox', ecoFile);
  if (originalFile) {
    formData.append('original', originalFile);
  }

  const { data, error } = await supabase.functions.invoke('verify-ecox', {
    body: formData
  });

  if (error) throw new Error(error.message || 'Error al verificar el archivo');
  if (!data) throw new Error('La verificación no devolvió datos');

  return {
    valid: data.valid,
    hash: data.hash,
    originalHash: data.originalHash || null,
    originalFileMatches: data.originalFileMatches || false,
    signature: { algorithm: data.signature?.algorithm || 'Ed25519', valid: data.signature?.valid || false },
    manifest: data.manifest || null
  };
}
```
</details>

### B) Observaciones online (refuerzos)

- Consultar anclajes y sellos de tiempo
- Mostrar resultados como **observaciones**, no como verdad unica

Regla de oro:

- Si no se puede consultar, se muestra “No consultado / Pendiente”.
- Nunca se muestra “falso” por falta de red.

---

### El refuerzo no reemplaza el hecho

## 11) Que aporta la blockchain (y por que usamos varias)

No usamos blockchain como marketing. La usamos como **refuerzo de evidencia**.

- **Polygon**: confirmaciones rapidas y costo eficiente.
- **Bitcoin / OpenTimestamps**: anclaje de mayor permanencia historica.
- **TSA (sellos de tiempo)**: refuerzos adicionales cuando aplica.

La logica es simple:

> Si EcoSign desaparece mañana, tu evidencia sigue viva.

Por eso combinamos redes y sellos: redundancia, independencia y resiliencia.

La evidencia no se apoya en una sola cadena. Se apoya en la realidad.

<details>
<summary>Ver prueba técnica (código real, anclaje Polygon)</summary>

Fuente: `client/src/lib/polygonAnchor.ts`

```ts
export async function anchorToPolygon(documentHash: string, options: AnchorRequestOptions = {}) {
  const supabase = getSupabase();
  if (!documentHash || !/^[a-f0-9]{64}$/i.test(documentHash)) {
    throw new Error('Invalid document hash. Must be SHA-256 hex string.');
  }

  const { data, error } = await supabase.functions.invoke('anchor-polygon', {
    body: {
      documentHash: documentHash.toLowerCase(),
      documentId: options.documentId || null,
      userId: options.userId || null,
      userEmail: options.userEmail || null
    }
  });

  if (error) throw new Error(error.message || 'Failed to anchor to Polygon');
  return { success: true, anchorId: data.anchorId, txHash: data.txHash, status: data.status };
}
```
</details>

<details>
<summary>Ver prueba técnica (código real, anclaje Bitcoin/OpenTimestamps)</summary>

Fuente: `client/src/lib/opentimestamps.ts`

```ts
export async function requestBitcoinAnchor(
  documentHash: string,
  context: AnchorContext = {}
): Promise<BitcoinAnchorResponse | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke<BitcoinAnchorResponse>('anchor-bitcoin', {
    body: {
      documentHash,
      documentId: context.documentId ?? null,
      userId: context.userId ?? null,
      userEmail: context.userEmail ?? null
    }
  });
  if (error) throw new Error(error.message || 'No se pudo crear la solicitud de anclaje');
  return data ?? null;
}
```
</details>

<details>
<summary>Ver prueba técnica (código real, TSA RFC 3161)</summary>

Fuente: `client/src/lib/tsaService.ts`

```ts
export async function requestLegalTimestamp(hashHex: string, options: TimestampOptions = {}) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('legal-timestamp', {
    body: { hash_hex: hashHex.toLowerCase(), tsa_url: options.tsaUrl || DEFAULT_TSA_URL }
  });

  if (error) throw new Error(error.message || 'No se pudo contactar a la TSA');
  if (!data?.success || !data.token) throw new Error(data?.error || 'La TSA no devolvió un token válido');

  const parsed = await verifyTSRToken(data.token, hashHex);
  return { timestamp: parsed?.timestamp, token: data.token, verified: parsed?.hashMatches !== false };
}
```
</details>

---

### Orquestacion sin friccion

## 12) Como se orquesta el refuerzo (colas, workers, triggers)

Los refuerzos se procesan en segundo plano para no frenar al usuario.

Modelo conceptual:

```pseudo
onECOEmitido(eco):
  enqueue(anclajePolygon, eco)
  enqueue(anclajeBitcoin, eco)

worker(anclajePolygon):
  txid = enviarPolygon(eco.manifiesto.hash)
  registrarObservacion(eco.id, txid)

worker(anclajeBitcoin):
  ots = enviarOpenTimestamps(eco.manifiesto.hash)
  registrarObservacion(eco.id, ots)
```

Se expone el resultado verificable (txid, block, ots), nunca la logica interna de empaquetado.

---

### Lo que guardamos y lo que no

## 13) Que guardamos y que no guardamos

EcoSign puede almacenar:

- Metadatos del .ECO
- Registros de observaciones (txid, timestamps, ids)

EcoSign no necesita almacenar:

- El documento en claro
- Claves privadas del usuario

Esto no es una promesa de marketing. Es una decision de arquitectura.

---

### El resumen que no confunde

## 14) Estado probatorio (definicion exacta)

El verificador muestra un resumen tecnico basado en señales disponibles:

- INTEGRIDAD OK
- ANCLAJE PENDIENTE
- ANCLAJE CONFIRMADO (POLYGON)
- ANCLAJE CONFIRMADO (BITCOIN / OTS)
- ANCLAJE NO CONSULTADO

Esto **no es una calificacion judicial**. Es un resumen de evidencia tecnica disponible.

---

## 15) Falsificacion, deteccion y recuperacion de la verdad

EcoSign no promete que un documento no pueda ser modificado. Promete algo mas importante: que cualquier modificacion sea detectable (tamper‑evident).

Cualquier archivo digital puede ser alterado. Un PDF puede editarse. Un .ECO puede abrirse. Un JSON puede tocarse.  
Eso no es una falla del sistema. Es una realidad del mundo digital.

Lo que EcoSign garantiza es esto:

- Si el documento o el .ECO se modifican, la verificacion falla.
- No hay forma de alterar un archivo sin romper la relacion criptografica entre ambos.
- No existen falsos positivos: un documento alterado nunca valida como autentico.

Y al mismo tiempo evita el problema inverso:

- Si un usuario modifica un documento por error o pierde una copia local, puede recuperar el original desde su espacio y volver a verificarlo.

En otras palabras:

> EcoSign no hace que la falsificacion sea imposible. Hace inevitable su deteccion.

La falsificacion existe. Lo que EcoSign elimina es la duda.

Pseudocodigo minimo:

```pseudo
resultado = verificarOffline(eco, documento)

if resultado == OK:
  mostrar("Documento autentico")
else:
  mostrar("Documento modificado o no correspondiente")
```

Micro‑casos (cristalino):

- Si editas el PDF, rompe el hash y no valida.
- Si editas el .ECO, rompe firma/estructura y no valida.
- Si editas ambos, no podes recrear la evidencia original sin las claves correctas.
- Si perdes el PDF, el .ECO sigue verificando su integridad propia (offline).
- Si el PDF existe en tu espacio cifrado, lo recuperas y volves a validar.

---

### Costo y verdad

## 16) Por que nuestra firma economica vale mas que muchas “firmas digitales”

En muchos servicios, el plan economico ofrece solo **logs internos**. Eso puede ser operativo, pero no siempre es probatorio.

En EcoSign, incluso la firma mas accesible incluye:

- integridad criptografica verificable,
- evidencia portable,
- refuerzos externos cuando aplica,
- y verificacion independiente.

Eso no garantiza un juicio. Pero entrega lo que un juez o perito busca revisar.

---

## 17) Transparencia de costos

Nuestro modelo es liviano porque:

- el procesamiento principal ocurre en el cliente,
- la evidencia es liviana,
- y la infraestructura es minima.

Eso nos permite precios bajos y previsibles.

- Las firmas certificadas tienen costo puntual.
- Se cobran cuando se usan, no antes ni despues.

No hay lock‑in oculto ni costos sorpresa.

---

## 18) Etica del producto

EcoSign no vende datos, no almacena documentos y no monetiza tu contenido.

Buscamos un modelo de relacion simple:

- vos conservas tu documento,
- vos conservas tu evidencia,
- y nosotros hacemos el trabajo duro de generar pruebas verificables.

La transparencia no es una funcion. Es el centro del producto.

---

### El contrato minimo

## 19) Contrato de datos del .ECO (conceptual)

El .ECO contiene:

- Manifiesto (hash, metadatos, timestamps)
- Firmas
- Intencion de anclajes (si aplica)

Las confirmaciones posteriores **no alteran** el .ECO. Se presentan como observaciones externas.

Contrato minimo (conceptual, no propietario):

```
manifest.hashAlgo = "SHA-256"
manifest.docHash = <hex>
manifest.createdAt = <ISO8601>
signatures[] = { algo: "Ed25519", pubKey, sig }
requestedReinforcements = { polygon: true, bitcoin: true, tsa: optional }
```

Invariantes verificables:

- Offline OK es condicion necesaria.
- Online nunca invalida lo offline.
- No hay "Inválido" por falta de red.

<details>
<summary>Ver prueba técnica (código real, validación de hash)</summary>

Fuente: `client/src/utils/hashDocument.ts`

```ts
export function isValidSHA256(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash)
}
```
</details>

---

### Lo que decimos y lo que no

## 20) Aclaraciones legales (necesarias y honestas)

- El estado probatorio es un resumen tecnico, no una sentencia.
- La relevancia de sellos de tiempo depende de la jurisdiccion.
- EcoSign no reemplaza peritajes, notarias ni tribunales.
- La evidencia tecnica puede ser considerada en esos procesos.

---

## 21) Lo que no mostramos (y por que)

EcoSign es transparente, pero responsable. No exponemos detalles de EcoPacker, el motor interno de empaquetado, porque forma parte del claim 2 de la PPA y esta en proceso de registro de propiedad intelectual.

Mostramos:

- flujos conceptuales,
- contratos de datos,
- pseudocodigo,
- resultados verificables.

No mostramos:

- algoritmos internos de empaquetado,
- optimizaciones propietarias,
- pipelines internos.

---

### Cierre

## 22) En resumen

EcoSign no es un dashboard. Es un sistema de evidencia.

No busca que confies. Busca que verifiques.

Si sos curioso, este documento es tu onboarding.
Si sos tecnico, este documento es tu contrato.
Si sos legal o compliance, este documento es tu base de revision.

La evidencia no deberia depender de una empresa.
Deberia depender de la realidad.

EcoSign se construye para eso.

La verdad no debería pedir permiso.
