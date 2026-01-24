# Especificación para Extracción de Código Real de EcoSign

## Objetivo
Exportar el core real de EcoSign para reutilización segura por CustodyArt y otros sistemas.

## Reglas Estrictas
- NO reescribir lógica
- NO cambiar algoritmos
- SOLO extraer y aislar código existente
- Resultado debe ser input → output puro
- El código DEBE existir hoy en EcoSign

## Componentes a Extraer

### 1. crypto/
Funciones criptográficas reales utilizadas en producción:

- Funciones de hashing reales (SHA-256) utilizadas para source_hash
- Funciones de canonicalización reales utilizadas para cálculos de integridad
- Funciones de encoding/decoding reales (base64, hex, etc.) utilizadas en EcoSign

### 2. witness/
Componentes reales de generación de witnesses sin dependencias de almacenamiento:

- El builder real de witnesses utilizado en producción
- El cálculo real del witness_hash utilizado en EcoSign
- El layout real del PDF de witness (sin dependencias de storage)

### 3. types/
Tipos reales utilizados por el código actual de EcoSign:

- Las interfaces reales utilizadas para DocumentEntity
- Los tipos reales utilizados para Custody
- Las interfaces reales utilizadas para Witnesses

## Criterios de Validación

### Prueba Crítica
Para validar que el código extraído es correcto, se debe ejecutar la siguiente prueba:

```
Mismo input → mismo hash
```

Comparando:
- EcoSign producción
- Sistema utilizando el código extraído

Si eso se cumple → ✅ Válido
Si no → ❌ Ese código no sirve, aunque "pase tests"

## Restricciones

Puede:
- Mover archivos
- Borrar dependencias
- Aislar funciones
- Eliminar código específico de infraestructura

NO puede:
- Cambiar algoritmos
- Reescribir lógica
- "Simplificar" la lógica criptográfica
- Introducir nuevas implementaciones

## Documentación Requerida

Para cada componente extraído, se debe incluir:
- Referencia al archivo original en EcoSign
- Fecha de extracción
- Versión de EcoSign de donde fue extraído
- Pruebas que demuestren equivalencia funcional