# UX Hardening Checklist v1.0
## Refinamiento fino sin tocar core. Documento ejecutable.

**Versión**: 1.0
**Estado**: Ready for implementation
**Propósito**: Cerrar fricción visual/UX sin cambiar lógica
**Audiencia**: Frontend dev
**Duración estimada**: 2 semanas

---

## 📋 Priorización General

| Prioridad | Tipo | Impacto | Sprint |
|-----------|------|---------|--------|
| 🔴 CRÍTICO | Bugs bloquean uso | Alto | 1 |
| 🟠 IMPORTANTE | Fricción real | Medio | 1-2 |
| 🟡 MEJORA | Claridad/elegancia | Bajo | 2 |

---

# 🔴 SPRINT 1: BUGS CRÍTICOS (Bloquean producto)

## BUG #1: Verificador interno no abre

**Estado**: Error al abrir verificador desde detalle de documento.

**Síntomas**:
- Click en "Verificador" → error
- Verificador público funciona
- Problema local en detalle documento

**Hipótesis probable**:
- Context de auth perdido
- ECO mutable después de refactor
- Ruta de componente rota

**Investigación requerida**:
```
1. Browser console → qué error específico
2. Verificar que ECO_v2 estructura es correcta
3. Verificar que contexto auth se propaga a modal
```

**Acceptance criteria**:
- [ ] Click en "Verificador" dentro de detalle abre modal
- [ ] ECO se carga correctamente
- [ ] Muestra "Válido" sin errores
- [ ] Puedo ver timeline

**Prioridad**: 🔴 CRÍTICO
**Blocker**: Sí (imposible usar verificador)

---

## BUG #2: Mi Cuenta no abre Centro Legal

**Estado**: No se puede abrir Centro Legal desde Mi Cuenta.

**Síntomas**:
- En Mi Cuenta no hay botón o no funciona
- En Inicio y Documentos sí funciona

**Causa probable**:
- Centro Legal modal no está renderizado en My Account page
- O modal tiene restricción de ruta

**Solución técnica**:
```
1. Verificar que <CentroLegalModal /> existe en layout general
2. O agregar a My Account específicamente
3. Verificar que auth context está disponible
```

**Aceptación**:
- [ ] Centro Legal abre desde Mi Cuenta
- [ ] Puedo crear documento/flujo desde ahí
- [ ] El documento aparece en Documentos

**Prioridad**: 🔴 CRÍTICO
**Blocker**: Sí (imposible trabajar desde Mi Cuenta)

---

## BUG #3: Toast "Borrador recuperado" repetitivo

**Estado**: Muestra toast cada sesión aunque sea el mismo borrador.

**Problema**:
Hoy solo chequea IF (borrador exists).
Debería chequear IF (borrador is NEW o UPDATED desde última sesión).

**Solución técnica**:

```typescript
// Guardar en localStorage al cerrar sesión
const sessionKey = 'lastSessionDraftCheck';
const draftTimestamp = localStorage.getItem(sessionKey);

// Al abrir documentos, solo mostrar toast si:
IF (draft.updated_at > draftTimestamp) {
  showToast("Borrador recuperado");
  localStorage.setItem(sessionKey, Date.now());
}
```

**Acceptance criteria**:
- [ ] Toast aparece solo una vez por sesión
- [ ] No aparece más si sesión se mantiene
- [ ] Desaparece al recargar si no hubo cambios

**Prioridad**: 🔴 CRÍTICO
**Blocker**: No (pero es ruido constante)

---

# 🟠 SPRINT 1: FRICCIONES IMPORTANTES

## FIX #1: Nombre largo esconde iconos en Centro Legal

**Estado**: Si documento tiene nombre largo, empuja/esconde iconos de acción.

**Ubicación**: Centro Legal → header del documento

**Problema visual**:
```
[Documento_con_nombre_muy_largo_que_no_termina_nunca...]  [X]
Los iconos se pierden detrás.
```

**Solución CSS**:

```css
.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}

.document-name {
  flex: 1;
  min-width: 0;  /* CLAVE: permite truncation */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.document-actions {
  flex-shrink: 0;  /* Nunca se encoge */
  display: flex;
  gap: 8px;
}
```

**Tooltip**:
```html
<div
  class="document-name"
  title={fullName}  {/* Tooltip hover */}
>
  {truncatedName}
</div>
```

**Acceptance criteria**:
- [ ] Iconos SIEMPRE visibles
- [ ] Nombre truncado con "…"
- [ ] Tooltip muestra nombre completo
- [ ] Funciona con nombres de 200 caracteres

**Prioridad**: 🟠 IMPORTANTE
**Blocker**: No (pero parece amateur)

---

## FIX #2: Verificador modal muy largo (no scrollea)

**Estado**: Modal excede viewport, no hay scroll, fuerza zoom fuera.

**Problema**:
```
Modal height > viewport
Sin overflow-y: auto
Fuerza zoom a 30% para cerrar
```

**Solución técnica**:

```css
.verificador-modal {
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.verificador-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Timeline debe estar adentro del scroll */
.timeline-container {
  flex: 1;
  overflow-y: auto;  /* Si el timeline es muy largo */
}
```

**HTML structure**:
```html
<Modal>
  <Modal.Header>...</Modal.Header>
  <Modal.Body scrollable={true}>  {/* Delegue scroll aquí */}
    <VerificadorContent />
  </Modal.Body>
  <Modal.Footer>...</Modal.Footer>
</Modal>
```

**Acceptance criteria**:
- [ ] Modal cabe en 90% del viewport
- [ ] Scroll funciona dentro del modal
- [ ] No requiere zoom para cerrar
- [ ] Footer siempre visible

**Prioridad**: 🟠 IMPORTANTE
**Blocker**: Sí (imposible usar verificador en pantalla pequeña)

---

## FIX #3: Ver Detalle modal también muy largo

**Estado**: Similar al verificador. Detalle del documento excede viewport.

**Solución**: Mismo patrón que Verificador.

```css
.detalle-modal {
  max-height: 90vh;
  overflow-y: auto;
}
```

**Acceptance criteria**:
- [ ] Scroll dentro del modal
- [ ] No fuerza zoom

**Prioridad**: 🟠 IMPORTANTE

---

## FIX #4: Sidebar "Operaciones" no respeta estado cerrado

**Estado**: Operaciones siempre abre aunque la dejé cerrada.

**Problema**: No persiste estado cerrado en localStorage.

**Solución**:

```typescript
// Hook para persistir sidebar state
export const useSidebarState = () => {
  const [sidebarState, setSidebarState] = useState(() => {
    const saved = localStorage.getItem('documents.sidebarState');
    return saved ? JSON.parse(saved) : { operaciones: false };  // Default closed
  });

  const updateState = (key, value) => {
    setSidebarState(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('documents.sidebarState', JSON.stringify(updated));
      return updated;
    });
  };

  return { sidebarState, updateState };
};
```

**Usage**:
```tsx
const { sidebarState, updateState } = useSidebarState();

<Sidebar
  operacionesOpen={sidebarState.operaciones}
  onToggleOperaciones={(value) => updateState('operaciones', value)}
/>
```

**Acceptance criteria**:
- [ ] Cierra operaciones → recarga → sigue cerrada
- [ ] Abre operaciones → recarga → sigue abierta
- [ ] Documentos abiertos por defecto (primera vez)

**Prioridad**: 🟠 IMPORTANTE

---

## FIX #5: Centro Legal spacing arriba (sin romper viewport)

**Estado**: Necesita más aire entre header y contenido. Pero pantallas 13" no pueden permitir más padding.

**Solución**:

```css
.centro-legal-container {
  padding-top: clamp(8px, 1.5vh, 16px);  /* Responsive, capped */
  /* En pantalla pequeña: 8px */
  /* En pantalla grande: hasta 16px */
}
```

**Regla de oro**:
- No fijar altura vertical en píxeles absolutos
- Usar `clamp()` para responsividad
- Testear en 13", 15", 27"

**Acceptance criteria**:
- [ ] 13" fullscreen → sin scroll
- [ ] 15" fullscreen → sin scroll
- [ ] Padding aumenta según pantalla
- [ ] NO se rompe con zoom 100-125%

**Prioridad**: 🟠 IMPORTANTE

---

# 🟡 SPRINT 2: MEJORAS CLARIDAD

## FEATURE #1: CTA "Asignar campos" en Flujo de Firmas

**Estado**: Falta CTA explícito. Usuario no entiende por qué Proteger está gris.

**Ubicación**: Abajo del formulario de firmantes, antes de Proteger.

**Diseño**:
```
[ Asignar campos ]         [ Proteger ]
```

**Comportamiento**:
```
1. Si NO hay campos asignados:
   - "Asignar campos" → outline, clickeable
   - "Proteger" → disabled, gris
   - Tooltip en Proteger: "Debes asignar campos antes de continuar"

2. Si ya hay campos asignados:
   - "Asignar campos" → cambia a "Revisar campos"
   - "Proteger" → primary, clickeable
```

**Código**:
```tsx
<div className="cta-row">
  <Button
    variant={fieldsAssigned ? "outline" : "outline"}
    onClick={openWizard}
  >
    {fieldsAssigned ? "Revisar campos" : "Asignar campos"}
  </Button>

  <Button
    variant="primary"
    onClick={protectFlow}
    disabled={!fieldsAssigned}
    title={!fieldsAssigned ? "Debes asignar campos" : ""}
  >
    Proteger
  </Button>
</div>
```

**Acceptance criteria**:
- [ ] CTA visible antes de Proteger
- [ ] State feedback claro (outline → primary)
- [ ] Click abre wizard
- [ ] Proteger disabled hasta asignar

**Prioridad**: 🟡 MEJORA

---

## FEATURE #2: Mails reales en Ver Detalle

**Estado**: Muestra "0 de 2". Debería mostrar mails de cada firmante.

**Ubicación**: Ver Detalle → sección Firmantes

**Hoy**:
```
Firmante 1: 0 de 2
Firmante 2: 0 de 2
```

**Debería ser**:
```
Firmante 1
📧 juan@example.com
Estado: Pendiente
[ Cambiar mail ]  (disabled, placeholder para luego)

Firmante 2
📧 maria@example.com
Estado: Firmado
```

**Código**:
```tsx
<div className="signers-list">
  {signers.map((signer, idx) => (
    <div key={signer.id} className="signer-card">
      <div className="signer-header">
        <span className="signer-label">Firmante {idx + 1}</span>
      </div>

      <div className="signer-mail">
        <Mail size={16} />
        <span>{signer.email}</span>
      </div>

      <div className="signer-status">
        Estado: <strong>{signer.status}</strong>
      </div>

      <Button
        variant="ghost"
        size="sm"
        disabled={true}  {/* Por ahora */}
        title="Próximamente"
      >
        Cambiar mail
      </Button>
    </div>
  ))}
</div>
```

**Acceptance criteria**:
- [ ] Muestra mail real de cada firmante
- [ ] Estado correcto (pendiente/firmado/cancelado)
- [ ] Placeholder para "Cambiar mail" visible
- [ ] Placeholder disabled con tooltip

**Prioridad**: 🟡 MEJORA

---

## FEATURE #3: Mostrar sesión activa en header

**Estado**: Usuario no sabe quién está logueado (para multi-account).

**Ubicación**: Header arriba derecha, antes de logout.

**Diseño**:
```
👤 manuel@example.com
Plan: Pro
```

O minimal:
```
manuel@example.com
```

**Código**:
```tsx
<div className="user-info">
  <span className="user-email">{user.email}</span>
  {user.plan && <span className="user-plan">{user.plan}</span>}
  <Button variant="ghost" onClick={logout}>Logout</Button>
</div>
```

**CSS**:
```css
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.user-email {
  font-weight: 500;
}

.user-plan {
  font-size: 12px;
  opacity: 0.7;
}
```

**Acceptance criteria**:
- [ ] Mail visible en header
- [ ] Plan visible si existe
- [ ] Responsive (mobile muestra solo icon + menu)

**Prioridad**: 🟡 MEJORA

---

## FEATURE #4: Separar toggle vs ocultar panel

**Estado**: Hoy toggle = desactiva módulo. Pero usuario quiere "ocultar visualmente sin desactivar".

**Problema**:
```
Usuario: "Quiero ocultar NDA pero sin perder los cambios"
Hoy: Toggle → desactiva → pierde cambios
```

**Solución**:
```
Separar conceptos:
- isActive (lógica)
- isVisible (UI)
```

**Código**:
```typescript
const [nda, setNda] = useState({
  isActive: true,
  isVisible: true,
  data: { ... }
});

// Flechita solo afecta isVisible
const toggleVisibility = () => {
  setNda(prev => ({
    ...prev,
    isVisible: !prev.isVisible
  }));
};

// Toggle real (switch) afecta isActive
const toggleActive = () => {
  setNda(prev => ({
    ...prev,
    isActive: !prev.isActive
  }));
};
```

**UI**:
```html
<!-- Título centrado con flechitas para ocultar/mostrar -->
<div className="panel-header">
  <Button onClick={() => toggleVisibility()} variant="ghost">←</Button>
  <h3>NDA</h3>
  <Button onClick={() => toggleVisibility()} variant="ghost">→</Button>
</div>

<!-- Toggle real en algún otro lugar -->
<Toggle
  checked={nda.isActive}
  onChange={toggleActive}
  label="Habilitar NDA"
/>

<!-- Panel se muestra/oculta sin perder datos -->
{nda.isVisible && <NDAPanel data={nda.data} />}
```

**Acceptance criteria**:
- [ ] Flechitas ocultan/muestran panel
- [ ] Datos no se pierden
- [ ] Toggle real sigue existiendo separado
- [ ] Estado persiste en session

**Prioridad**: 🟡 MEJORA

---

## FEATURE #5: Nombres centra dos + flechitas en paneles

**Estado**: Títulos de NDA, Flujo, Centro Legal deberían estar centrados con flechitas en los lados.

**Diseño**:
```
[ ← ]     Centro Legal     [ → ]
[ ← ]     NDA              [ → ]
[ ← ]     Flujo de Firmas  [ → ]
```

**Comportamiento**:
- Flechitas → ocultan/muestran panel lateral
- NO tocan toggle de activación
- Solo visibilidad

**CSS**:
```css
.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 8px;
}

.panel-title h3 {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
}

.panel-arrows {
  display: flex;
  gap: 8px;
}

.panel-arrow {
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.2s;
}

.panel-arrow:hover {
  opacity: 1;
}
```

**Acceptance criteria**:
- [ ] Títulos centrados
- [ ] Flechitas ocultan/muestran paneles
- [ ] Layout simétrico
- [ ] Responsive (mobile esconde flechitas)

**Prioridad**: 🟡 MEJORA

---

## FEATURE #6: Click fuera → preguntar guardar

**Estado**: Click fuera de Centro Legal no pregunta si guardar.

**Hoy**: Hay que ir a botón "Cerrar sin guardar".

**Debería**: Click fuera → modal de confirmación.

**Código**:
```typescript
const handleClickOutside = (e) => {
  if (!centroLegalRef.current?.contains(e.target)) {
    if (hasUnsavedChanges) {
      showConfirmDialog({
        title: "¿Guardar cambios?",
        buttons: [
          { label: "Guardar", action: saveDraft },
          { label: "Descartar", action: closeWithoutSave },
          { label: "Cancelar", action: cancel }
        ]
      });
    } else {
      closeCentroLegal();
    }
  }
};

useEffect(() => {
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [hasUnsavedChanges]);
```

**Acceptance criteria**:
- [ ] Click fuera → pregunta si hay cambios
- [ ] Modal con 3 opciones (Guardar / Descartar / Cancelar)
- [ ] No interfiere con clicks internos

**Prioridad**: 🟡 MEJORA

---

## FEATURE #7: Rotar documento

**Estado**: Si PDF está horizontal, no hay forma de rotar.

**Ubicación**: Centro Legal → iconos de acción

**Comportamiento**:
```
1. Click en rotar → gira 90°
2. Cada click otro 90°
3. Rotación es visual (metadata, no PDF)
4. Se persiste en sesión
```

**Código**:
```typescript
const [rotation, setRotation] = useState(0);

const rotateDocument = () => {
  setRotation(prev => (prev + 90) % 360);
};

// Aplicar rotación en canvas
const pdfCanvasStyle = {
  transform: `rotate(${rotation}deg)`,
  transition: 'transform 0.2s',
};
```

**HTML**:
```html
<div className="document-actions">
  <Button
    onClick={rotateDocument}
    title="Rotar 90°"
  >
    ⟳
  </Button>
  <Button onClick={zoomIn}>+</Button>
  <Button onClick={viewLarge}>👁</Button>
</div>
```

**Acceptance criteria**:
- [ ] Botón rotar visible
- [ ] Gira 90° cada click
- [ ] 4 clicks = vuelve a original
- [ ] No cambia PDF original
- [ ] Metadata se persiste en sesión

**Prioridad**: 🟡 MEJORA

---

# 🟢 SPRINT 2: WIZARD Y CAMPOS

## FEATURE #1: Wizard más compacto (paneles colapsables)

**Estado**: Wizard es muy largo. Necesita ser más compacto.

**Solución**: 3 paneles colapsables.

**Paneles**:
```
1. ¿Qué completa cada firmante?
   - Lista de firmantes con campos asignados
   - Toggle para "agregar campo"

2. ¿Dónde aparece?
   - Final del documento
   - Cada página
   - Posición en página

3. Tamaño de página
   - Forzar formato
   - Escala
```

**Comportamiento**:
- Solo uno abierto a la vez
- Click expande/contrae
- Guardar no cierra (usuario decide)

**Código estructura**:
```tsx
const [expandedPanel, setExpandedPanel] = useState(0);

<div className="wizard-panels">
  {panels.map((panel, idx) => (
    <Panel key={idx} expanded={expandedPanel === idx}>
      <Panel.Header
        onClick={() => setExpandedPanel(expandedPanel === idx ? -1 : idx)}
      >
        {panel.title}
      </Panel.Header>
      <Panel.Content>
        {panel.content}
      </Panel.Content>
    </Panel>
  ))}
</div>
```

**CSS**:
```css
.wizard-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 12px;
}

.wizard-panel--header {
  padding: 16px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
}

.wizard-panel--content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s;
}

.wizard-panel--expanded .wizard-panel--content {
  max-height: 500px;
  padding: 16px;
  border-top: 1px solid var(--border);
}
```

**Acceptance criteria**:
- [ ] 3 paneles colapsables
- [ ] Solo uno abierto por defecto
- [ ] Click expande/contrae
- [ ] Contenido no se pierde
- [ ] Ocupan 40% menos espacio que versión actual

**Prioridad**: 🟢 MEJORA

---

## FEATURE #2: Preview sin toolbar innecesaria

**Estado**: Preview del documento muestra toolbar de PDF (zoom, rotate, etc.)

**Solución**: Preview como canvas estático.

**Remover**:
- Toolbar de zoom
- Botón rotar
- Buscar
- Descargar

**Mantener**:
- Visualización limpia
- Posible scroll si es largo

**Código**:
```tsx
<PDFViewer
  file={document}
  toolbar={false}  // Remover toolbar
  showControls={false}
  className="preview-canvas"
/>
```

**CSS**:
```css
.preview-canvas {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
  /* Sin interactividad de usuario */
  user-select: none;
  pointer-events: none;
}
```

**Acceptance criteria**:
- [ ] Sin toolbar visible
- [ ] Canvas limpio
- [ ] Solo visualización
- [ ] Documentos largos tienen scroll vertical

**Prioridad**: 🟢 MEJORA

---

## FEATURE #3: Soporte para "firma en cada página"

**Estado**: Hoy solo soporta firma final. Necesita firma por página (Realtors case).

**Modelo conceptual**:
```
Grupo de firma tiene TIPO:
- Final (default)
- Por página (new)

Si Por página:
- Genera campo en cada página
- Posición configurable (margen izq/der)
- Automático (no manual)
```

**Datos**:
```typescript
{
  signerGroups: [
    {
      id: 1,
      signer: "Juan",
      type: "final",
      position: { page: "last", x: 100, y: 100 }
    },
    {
      id: 2,
      signer: "Maria",
      type: "per_page",
      position: "margin_left",  // margin_left | margin_right | margin_center
      pageRange: [0, -1]  // Todas las páginas menos última
    }
  ]
}
```

**UI en Wizard**:
```
Firmante 1 (Juan)
☑ Firma final
☐ Firma en cada página

[Si ☑ Firma en cada página]
  Posición: [ Margen izquierdo ▼ ]
  Excluir página: [ última página ]
```

**Acceptance criteria**:
- [ ] Toggle "Firma en cada página"
- [ ] Si activo → selector de posición
- [ ] Campos se generan automáticamente
- [ ] Usuario NO edita campo por campo
- [ ] Se persiste en modelo

**Prioridad**: 🟢 MEJORA

---

## FEATURE #4: "Agregar grupo adicional" en Wizard

**Estado**: Hoy cada firmante tiene UN grupo.

**Necesidad**: Algunos casos necesitan N grupos por firmante.

**Ejemplo**: Realtors con firma final + firma en cada página.

**Diseño**:
```
Firmante 1 (Juan)
  Grupo 1: Firma final
  Grupo 2: Firma en cada página

  [ + Agregar grupo ] (opcional)
```

**Comportamiento**:
- Agregar grupo → dropdown: tipo (Final / Per-page)
- Sin límite de grupos
- Todos se aplican automáticamente

**Código**:
```tsx
const [groups, setGroups] = useState([
  { id: 1, type: 'final', ... }
]);

const addGroup = () => {
  setGroups([
    ...groups,
    { id: generateId(), type: 'final', ... }
  ]);
};
```

**Acceptance criteria**:
- [ ] CTA "+ Agregar grupo" visible
- [ ] Click agrega nuevo grupo (default: Final)
- [ ] Puedo cambiar tipo
- [ ] Configuración se persiste
- [ ] Sin límite arbitrario

**Prioridad**: 🟢 MEJORA

---

# 🎯 SPRINT 3: ACCIONES Y JERARQUÍA

## CLEANUP #1: Remover acciones innecesarias en Centro Legal

**Hoy hay**:
- Cambiar (parece rotar)
- Fijar posiciones
- Crear campo

**Debería haber solo**:
- Rotar
- Reemplazar documento
- Ver en grande

**Aceptación**:
- [ ] Solo 3 botones visibles
- [ ] Resto removido o en overflow menu
- [ ] Claridad aumenta

**Prioridad**: 🟡 CLEANUP

---

## CLEANUP #2: Jerarquizar acciones en Documentos

**Hoy todo está al mismo nivel**. Debería separarse:

**Grupo 1 – Evidencia** (siempre visible):
- Descargar ECO
- Copia fiel
- Original
- Verificar

**Grupo 2 – Operación** (siempre visible):
- Continuar firma
- Cancelar
- Agregar a operación

**Grupo 3 – Futuro** (overflow o disabled):
- Firma presencial

**UI**:
```
[Descargar ECO] [Verificar]
─────────────────────────
[Continuar] [Cancelar] [+ Operación]
─────────────────────────
[Firma Presencial]  (próximamente)
```

**Acceptance criteria**:
- [ ] Grupos separados visualmente
- [ ] Mejor escaneo rápido
- [ ] Jerarquía clara

**Prioridad**: 🟡 CLEANUP

---

## CLEANUP #3: Cambiar copy "Cambiar documento"

**Problema**: "Cambiar" parece "Rotar" cuando debería ser "Reemplazar".

**Solución**:
- Cambiar "Cambiar documento" → "Reemplazar documento"

**Acceptance criteria**:
- [ ] Copy actualizado
- [ ] No confunde con rotar

**Prioridad**: 🟡 COPY

---

## FEATURE: Copy y textos menos técnicos en Inicio

**Estado**: "Proteger al firmar, crear flujo o enviar NDA" es muy técnico.

**Debería**: Más simple y aspiracional.

**Sugerencias**:
```
Hoy:
"Tu centro de firma y protección legal"
"Proteger al firmar, crear flujo o enviar NDA"

Mejor:
"Firma segura y verificable"
"Protege tus documentos, obtén firmas legales, comparte acuerdos"

O:
"Documentos con certeza legal"
"Firma, protege y verifica con confianza"
```

**Acceptance criteria**:
- [ ] Copy reduce tecnicismo
- [ ] Sigue siendo claro
- [ ] Más motivador

**Prioridad**: 🟡 COPY

---

# 📊 MATRIZ DE EJECUCIÓN

## Dependencias y secuencia recomendada

```
SEMANA 1 (BUGS CRÍTICOS):
├─ BUG #1: Verificador no abre
├─ BUG #2: Mi Cuenta no abre Centro Legal
├─ BUG #3: Toast repetitivo
└─ FIX #2: Verificador scroll (relacionado a BUG#1)

SEMANA 1-2 (FRICCIONES):
├─ FIX #1: Nombre largo
├─ FIX #3: Ver Detalle scroll
├─ FIX #4: Sidebar state
├─ FIX #5: Centro Legal padding
└─ FEATURE #1: CTA Asignar campos

SEMANA 2 (CLARIDAD):
├─ FEATURE #2: Mails reales
├─ FEATURE #3: Header sesión
├─ FEATURE #4: Toggle vs ocultar
├─ FEATURE #5: Títulos centrados
├─ FEATURE #6: Click fuera → guardar
├─ FEATURE #7: Rotar documento
└─ CLEANUP #1-3

SEMANA 2-3 (WIZARD Y CAMPOS):
├─ WIZARD #1: Paneles colapsables
├─ WIZARD #2: Preview limpio
├─ WIZARD #3: Firma por página
└─ WIZARD #4: Agregar grupo
```

---

# ✅ ACCEPTANCE GENERAL

Una tarea está "DONE" cuando:

1. ✅ Código compila sin warnings
2. ✅ Funciona en Chrome, Firefox, Safari
3. ✅ Responsive (mobile, tablet, desktop)
4. ✅ Todos los puntos de acceptance pasados
5. ✅ No rompe funcionalidad existente
6. ✅ Tests E2E no tienen regressions
7. ✅ Dev puede explicar qué hizo sin vaguedad

---

# 🔍 QA FINAL

Antes de marcar como "DONE":

```
[ ] TypeScript: sin errores (npm run typecheck)
[ ] Linting: sin warnings (npm run lint)
[ ] Responsividad: testear en 13", 15", 27"
[ ] Zoom: testear 75%, 100%, 125%, 150%
[ ] Performance: no regresión en Lighthouse
[ ] Accessibility: keyboard navigation ok
[ ] Cross-browser: Chrome, Firefox, Safari, Edge
[ ] Mobile: iOS Safari, Android Chrome
[ ] No hay console.errors
[ ] No hay broken links
```

---

**Propósito de este checklist**: Que cualquier dev pueda tomar una tarea, implementarla sin necesidad de preguntar, y entregar exactamente lo que se espera.

Si hay ambigüedad en algún punto, avísame ahora.
