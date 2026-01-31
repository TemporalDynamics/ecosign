# Guía para Extraer el Código Real de EcoSign

## Objetivo
Extraer el código criptográfico real de EcoSign para crear una librería compartida que pueda ser utilizada por CustodyArt y otros sistemas sin duplicar lógica sensible.

## Pasos para la Extracción

### 1. Identificar Componentes Criptográficos Reales

Buscar en el código de EcoSign los siguientes componentes:

#### Funciones de Hashing
- Buscar funciones que calculan SHA-256
- Localizar el código que genera `source_hash`
- Encontrar cualquier preprocesamiento especial antes de hacer hash

#### Funciones de Canonicalización
- Buscar funciones que convierten objetos a representaciones determinísticas
- Localizar código que ordena propiedades de objetos para hashing
- Encontrar cualquier formato especial de serialización

#### Funciones de Encoding/Decoding
- Buscar funciones de conversión base64
- Localizar funciones de conversión hexadecimal
- Encontrar cualquier formato especial de serialización

#### Componentes de Witness
- Buscar código que construye documentos de witness
- Localizar el cálculo real del `witness_hash`
- Encontrar la generación real del PDF de witness
- Identificar cómo se incluyen las referencias de evidencia

### 2. Aislar el Código

Para cada componente encontrado:

1. Copiar EXACTAMENTE el código existente
2. Eliminar dependencias de bases de datos
3. Eliminar dependencias de frameworks web
4. Eliminar dependencias de servicios externos
5. Mantener solo la lógica criptográfica pura
6. Asegurar que las funciones sean puras: input → output

### 3. Validar la Equivalencia

Después de la extracción, realizar pruebas de equivalencia:

```typescript
// Ejemplo de prueba de equivalencia
const testData = new Uint8Array([1, 2, 3, 4, 5]);

// Hash con código de producción de EcoSign
const productionHash = await ecoSignProduction.hashBytes(testData);

// Hash con código extraído
const extractedHash = await extractedModule.hashBytes(testData);

console.assert(productionHash === extractedHash, "Los hashes deben ser idénticos");
```

### 4. Componentes Específicos a Buscar

#### En hashing/cryptografía:
- Funciones que calculan SHA-256 en el contexto de `source_hash`
- Funciones que calculan hashes en el contexto de `witness_hash`
- Cualquier función de hashing utilizada para integridad de documentos

#### En witness generation:
- Código que construye el documento de witness
- Lógica que incluye metadatos en el witness
- Código que genera el PDF de witness
- Funciones que calculan el hash del witness

#### En tipos/interfaces:
- Interfaces reales utilizadas para DocumentEntity
- Tipos reales utilizados para CustodyMode
- Interfaces reales utilizadas para Witnesses

### 5. Verificación Final

Antes de entregar el código extraído, asegurarse de que:

- [ ] Todas las funciones son puras (sin efectos secundarios)
- [ ] No hay dependencias de base de datos
- [ ] No hay dependencias de frameworks web
- [ ] Las funciones producen exactamente los mismos resultados que en producción
- [ ] El código ha sido probado con datos reales de producción
- [ ] No se han cambiado algoritmos criptográficos
- [ ] No se ha simplificado la lógica criptográfica

### 6. Documentación Requerida

Incluir en cada archivo extraído:
- Referencia al archivo original en EcoSign
- Fecha de extracción
- Versión de EcoSign de donde fue extraído
- Pruebas que demuestren equivalencia funcional