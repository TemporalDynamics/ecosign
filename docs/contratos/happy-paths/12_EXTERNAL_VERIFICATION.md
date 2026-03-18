# Happy Path 12: Verificacion externa (publica)

**Clasificacion:** SECONDARY
**Actor:** Verificador publico (sin cuenta)
**Trigger:** Verificador navega a `/verify`
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md

---

## Paso a paso

1. Usuario publico (sin cuenta) abre pagina Verificador (`/verify`)
2. Usuario sube:
   - Archivo ECO (o ECOX para auditoria extendida)
   - Documento original (PDF)
3. Sistema parsea ECO y extrae datos de certificacion
4. Sistema ejecuta verificaciones de integridad:
   - Verificacion de hash (`verify-ecox` function)
   - Validacion de timestamp (RFC 3161)
   - Verificacion de anclaje blockchain (Polygon/Bitcoin si existe)
5. Sistema genera timeline:
   - Todos los eventos en orden cronologico
   - Firmantes con niveles de identidad y timestamps
   - Confirmacion TSA + anclajes blockchain
   - Tooltips explicando cada evento
6. UI muestra:
   - **Nivel de proteccion:** NONE / ACTIVE / REINFORCED / TOTAL
   - **Niveles de identidad** por firmante: L0-L5
   - **Timeline** de eventos con links a evidencia
7. Verificador puede exportar/imprimir reporte de verificacion

## Estado final

Verificacion publica completa, timeline visible, integridad confirmada o disputada.

## Reglas

- La verificacion es 100% publica: NO requiere cuenta ni autenticacion
- El verificador NO tiene acceso al contenido del documento, solo a la evidencia
- La verificacion blockchain es independiente de EcoSign (cualquiera puede verificar el tx hash)
- Los niveles de proteccion se derivan automaticamente de la evidencia presente
- Si falta evidencia esperada: se muestra warning, no error
