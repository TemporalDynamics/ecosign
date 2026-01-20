# Mapa Canónico de Ecosign

Este documento es el "índice de verdad" del proyecto. Su propósito es ayudar a navegar la complejidad y la entropía de la documentación y el código, distinguiendo entre la "verdad operativa" y la narrativa.

Se clasifica cada artefacto principal según la pregunta: **"¿Esto es ley, explicación o historia?"**

---

## 1. Ley (Verdad Operativa)

*Lo que el sistema **es** y **hace** actualmente. El código y la configuración que están en vigor.*

- **Código Fuente Principal**:
    - `client/src/`: Código fuente del frontend (React). Define la experiencia de usuario.
    - `eco-packer/src/`: Lógica de negocio para el empaquetado.
    - `ffmpeg-orchestrator/src/`: Lógica de negocio para la orquestación de video.
    - `packages/`: Módulos de TypeScript compartidos. El corazón de la lógica reutilizable.

- **Contratos Inteligentes**:
    - `contracts/DigitalNotary.sol`: Define las reglas de la notaría digital en la blockchain.
    - `contracts/VerifySignAnchor.sol`: Define las reglas para el anclaje de firmas.

- **Configuración e Infraestructura**:
    - `package.json`, `deno.json`, `tsconfig.base.json`: Definen las dependencias, scripts y reglas de compilación. Son la ley para el entorno de desarrollo.
    - `.github/workflows/`: Define los procesos de Integración y Despliegue Continuo (CI/CD). Es la ley sobre cómo se prueba y despliega el código.
    - `migrations/`: Define la estructura y evolución de la base de datos. La suma de estas migraciones representa el estado actual de la "ley" de los datos.

- **Scripts de Despliegue y Operaciones**:
    - `deploy-ready/`: Scripts que preparan y ejecutan los anclajes en las blockchains. Son la ley del proceso de anclaje.

## 2. Explicación

*Documentos que **describen** o **aclaran** la ley. Ayudan a entenderla, pero no son la ley en sí mismos. Si una explicación contradice la ley, la ley prevalece.*

- **Guías y READMEs**:
    - `README.md` (en raíz y subdirectorios): Proporcionan el punto de entrada y resumen de cada componente.
    - `client/LOCAL_DEV_GUIDE.md`: Explica cómo configurar el entorno de desarrollo local.
    - `deploy-ready/INSTRUCCIONES_DEPLOY.md`: Explica el proceso de despliegue.

- **Documentación Arquitectónica y de Diseño**:
    - `docs/architecture/`: Diagramas y documentos que explican la estructura del sistema.
    - `docs/como-lo-hacemos.md`: Documento de alto nivel que explica el enfoque del proyecto.
    - `eco-packer/API.md`, `ffmpeg-orchestrator/API.md`: Describen las interfaces de programación de los componentes.

- **Documentos de Auditoría y Seguridad**:
    - `docs/CONTRACT_AUDIT_FOR_EXECUTOR.md`: Explicación para auditores sobre los contratos.
    - `eco-packer/SECURITY.md`: Describe las consideraciones de seguridad del componente.

## 3. Historia

*Artefactos que representan un estado pasado del proyecto. Útiles para el contexto, pero **no deben ser considerados como la verdad actual**. Son fotografías de un momento en el tiempo.*

- **Archivos y Decisiones Pasadas**:
    - `docs/archive/`: Directorio explícito para documentación obsoleta.
    - `docs/decisions/`: Registro de decisiones tomadas. Explican el *porqué* de la ley actual, pero no son la ley.
    - `docs/sprints/`: Documentación de sprints pasados.
    - `CHANGELOG.md` (en los componentes): Registran los cambios a lo largo del tiempo.

- **Informes y Análisis Puntuales**:
    - `docs/inventario_canonico_2026-01-18.md`: Un inventario con fecha, claramente una foto del pasado.
    - `docs/REPORTE_ANALISIS_FIRMA_GUESTS.md`: Informe sobre un problema específico, ya resuelto.
    - `docs/SOLUCION_BUG_FIRMA_GUESTS.md`: Documenta la solución a un bug, es historia de cómo se arregló algo.

- **Registros de Mantenimiento**:
    - `eco-packer/MAINTENANCE_LOG.md`: Historial de mantenimiento del componente.

---

Este mapa es el primer paso. Una vez establecido, podemos usarlo para:
1.  **Identificar contradicciones**: Comparar documentos de "Explicación" con la "Ley" que describen.
2.  **Aplanar migraciones**: Analizar el directorio `migrations/` para construir una vista consolidada del esquema de BD actual.
3.  **Analizar flujos de llamadas**: Enfocarnos en los directorios de "Ley" para mapear las interacciones entre componentes sin necesidad de un IDE.
