# Canvas Virtual Surfaces

Inventario canónico de superficies que renderizan `PdfEditViewer`.

## Superficies Activas
- `client/src/components/LegalCenterModalV2.tsx`
- `client/src/components/OTPAccessModal.tsx`
- `client/src/components/SignatureWorkshop.tsx`
- `client/src/components/centro-legal/scenes/DocumentScene.tsx`
- `client/src/components/centro-legal/scenes/FlowScene.tsx`
- `client/src/components/centro-legal/scenes/NdaScene.tsx`
- `client/src/components/centro-legal/scenes/ReviewScene.tsx`
- `client/src/components/signature-flow/DocumentViewer.tsx`
- `client/src/components/signature/FieldPlacer.tsx`
- `client/src/pages/DocumentsPage.tsx`
- `client/src/pages/NdaAccessPage.tsx`

## Excepción Contractual
- `client/src/centro-legal/modules/flow/SignerFieldsWizard.tsx`
  - Excepción permitida por contrato para edición de campos.
  - No puede romper geometría base ni coordenadas canónicas.
