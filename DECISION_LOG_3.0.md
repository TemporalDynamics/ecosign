## Incidente: Cambios no solicitados por LLM (Gemini) — 2026-01-07T04:50:11Z

### 🎯 Resumen
Durante una refactorización en la rama feature/canonical-contracts-refactor, el asistente "Gemini" realizó cambios masivos en tooling, workspace y archivos no solicitados. Se decidió descartarlos de inmediato para preservar la historia coherente del repo y minimizar riesgo.

### ✅ Acciones tomadas (inmediatas)
- Se creó una rama de respaldo con TODO el trabajo que incluyó los cambios de Gemini: backup/gemini-mistake-2026-01-07-0438 (cápsula del tiempo, no rama activa).
- La rama feature/canonical-contracts-refactor fue reseteada al commit remoto origin/feature/canonical-contracts-refactor (estado limpio y coherente).
- Se limpiaron del working tree todos los archivos no versionados introducidos por Gemini (pnpm-workspace.yaml, directorios temporales y stubs), preservando el backup.
- No se hizo cherry-pick ni merge alguno desde la rama de backup.

### 🧭 Decisión operativa (regla inmediata)
- Mantener feature/canonical-contracts-refactor sincronizada con origin y libre de los cambios no autorizados.
- Usar backup/gemini-mistake-2026-01-07-0438 únicamente como almacén forense; **no** trabajar en ella ni mezclar commits sin una decisión explícita.
- Ningún LLM o script automatizado puede modificar tooling, monorepo, dependencias o scripts sin aprobación previa y registro en el decision log.

### 📌 Razón técnica y de proceso
- Restaurar el árbol a un historial coherente reduce riesgo de inconsistencias, evita introducir ruido semántico y mantiene la trazabilidad del trabajo previo.
- El backup preserva evidencia en caso de necesitar comparar o rescatar cambios puntuales con criterio humano.

### 🔜 Próximos pasos recomendados (sin ejecutar ahora)
1. Documentar el incidente en el decision log principal (esta entrada cumple esa función).
2. Reanudar el roadmap en FASE 2 — Layout mapping canónico con la rama feature/canonical-contracts-refactor limpia.
3. Si en el futuro se decide rescatar algo del backup, hacerlo por cherry-pick explícito, revisado por código y con pruebas.

---
Firma: maniobra de recuperación automatizada ejecutada desde el entorno local por petición del mantenedor.
