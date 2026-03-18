# Happy Paths — EcoSign

Paso a paso de cada flujo del sistema. Cada archivo describe un camino feliz
completo: actor, trigger, pasos numerados, estado final y clasificacion para beta.

## Flujos CORE (requeridos para beta: 1 broker + 10 agentes)

| # | Flujo | Actor | Archivo |
|---|-------|-------|---------|
| 1 | Onboarding | Usuario nuevo | `01_ONBOARDING.md` |
| 2 | Proteccion de documento | Owner | `02_DOCUMENT_PROTECTION.md` |
| 3 | Firma visual (owner) | Owner | `03_VISUAL_SIGNATURE.md` |
| 4 | Workflow de firma (multi-signer) | Owner + Signers | `04_SIGNATURE_WORKFLOW.md` |
| 5 | Firmante invitado (guest) | Guest signer | `05_GUEST_SIGNER.md` |
| 6 | Custodia cifrada | Sistema | `06_CUSTODY_ENCRYPTION.md` |
| 7 | Orquestacion (jobs) | Sistema | `07_ORCHESTRATION.md` |

## Flujos SECONDARY (deseables para beta, no bloqueantes)

| # | Flujo | Actor | Archivo |
|---|-------|-------|---------|
| 8 | Configuracion NDA | Owner | `08_NDA_CONFIGURATION.md` |
| 9 | Firma batch (multi-documento) | Owner + Signers | `09_BATCH_SIGNATURE.md` |
| 10 | Firma presencial (QR) | Owner + Signer | `10_IN_PERSON_SIGNATURE.md` |
| 11 | Operaciones (organizacion) | Owner | `11_OPERATIONS.md` |
| 12 | Verificacion externa (publica) | Verificador publico | `12_EXTERNAL_VERIFICATION.md` |
