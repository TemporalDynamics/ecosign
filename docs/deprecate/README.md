# 🗄️ Deprecated Documentation

**Last Updated:** 2025-12-16

This folder contains **historical documentation** that is no longer actively maintained but preserved for reference.

---

## 📁 Folder Structure

### `/roadmaps/` - Project Roadmaps & Planning
Historical roadmaps, MVP checklists, and product decisions.

**Files:**
- ROADMAP.md
- ROADMAP_MVP.md
- roadmap-infalibilidad-COMPLETADO.md
- MVP_CHECKLIST_FINAL.md
- MVP_IMPLEMENTATION_GUIDE.md
- DECISIONES_PRODUCTO_WORKFLOW.md

**Why deprecated:** Roadmaps are time-bound and completed. Current roadmap should be tracked in project management tools (Jira, Linear, etc.).

---

### `/status-reports/` - Point-in-Time Status Reports
Snapshots of implementation status at specific dates.

**Files:**
- ANCHORING_STATUS_REPORT.md
- IMPLEMENTATION_STATUS.md
- MVP_STATUS_AND_NEXT_STEPS.md
- POLYGON_TEST_RESULTS.md
- TESTING_ATOMIC_TRANSACTIONS.md
- SIGNNOW_EMBED_AUDIT.md
- QUICK_WINS_AUDIT.md
- code_analysis_summary.md

**Why deprecated:** Status reports become outdated. Current status should be in living documents or dashboards.

---

### `/implementation-logs/` - Implementation Summaries
Detailed logs of completed implementations.

**Files:**
- ANCHORING_AUDIT_SUMMARY.md
- ANCHORING_HARDENING_PR.md
- POLYGON_ANCHORING_ANALYSIS.md
- EMAIL_NOTIFICATIONS_IMPLEMENTATION.md
- EMAIL_SYSTEM_FINAL_REPORT.md
- CONEXION_REAL_COMPLETADA.md
- CONFIGURACION_RESEND_COMPLETA.md
- COMPONENTE_CERTIFICATION_MODAL.md
- RESUMEN_FINAL_CAMBIOS.md
- RESUMEN_IMPLEMENTACION_COMPLETA.md
- dashboard_cleanup.md
- CAMBIOS_VERIFICADOR.md
- AUDITORIA_MANDAMIENTOS.md
- AUDITORIA_UI_MANDAMIENTOS.md
- RESPUESTAS_INVESTIGADOR.md

**Why deprecated:** These were "summary reports" after implementation. The actual technical details are now in:
- ARCHITECTURE.md (system design)
- DEPLOYMENT_GUIDE.md (how to deploy)
- RUNBOOK.md (how to operate)

---

### `/bugfixes/` - Bug Investigation Reports
Detailed investigation of specific bugs.

**Files:**
- BUGFIX_LOGIN_EMAIL.md
- DEBUG_LOGIN.md
- VIDEO_FIX_SUMMARY.md

**Why deprecated:** Bugfixes should be tracked in:
- Git commit messages
- GitHub Issues
- Incident reports (see RUNBOOK.md)

These docs were useful during investigation but don't need to live in main docs/.

---

### `/misc/` - Miscellaneous
Various docs that don't fit other categories.

**Files:**
- COMO_LO_HACEMOS.md (Philosophy doc)
- EMAIL_TEMPLATES.md (Superseded by EMAIL_TEMPLATES_GUIDE.md)
- deployment.md (OLD, superseded by DEPLOYMENT_GUIDE.md)
- DEPLOY_GUIDE.md (Partial, merged into DEPLOYMENT_GUIDE.md)
- architecture.md (OLD, superseded by ARCHITECTURE.md)
- paginas_que_tenias_en_el_tag.md
- test_notes.md

**Why deprecated:** Either superseded by better docs or no longer relevant.

---

## 🔍 How to Use This Archive

### If you need to reference old roadmaps:
```bash
cd docs/deprecated/roadmaps/
grep -r "feature name" .
```

### If you need to see how something was implemented:
```bash
cd docs/deprecated/implementation-logs/
# Read relevant summary
```

### If you need to understand a past bug:
```bash
cd docs/deprecated/bugfixes/
# Read investigation report
```

---

## ✅ Current (Non-Deprecated) Documentation

For **active, maintained documentation**, see:

📁 `/docs/` (root level)

**Architecture & Design:**
- ARCHITECTURE.md ✨
- TRUST_BOUNDARIES.md ✨
- SIGNATURE_WORKFLOW_ARCHITECTURE.md

**Operations:**
- RUNBOOK.md ✨
- DEPLOYMENT_GUIDE.md
- logging-monitoring-guide.md
- health-check-setup.md
- CRON_JOBS_MANAGEMENT.md

**Security:**
- SECURITY_BEST_PRACTICES.md
- SECURITY_RLS_CHECKLIST.md
- SECURITY_SIGNATURES.md
- KEY_ROTATION_PLAN.md
- audit.md
- security.md

**Development:**
- README.md
- README_FOR_DEV.md
- api-reference.md
- database-schema-analysis.md
- E2E_TEST_MANUAL.md

**Blockchain:**
- BITCOIN_ANCHORING_GUIDE.md
- POLYGON_ANCHORING_SETUP.md
- README_ANCHORING.md
- ANCHORING_FLOW.md

**Integrations:**
- EMAIL_TEMPLATES_GUIDE.md
- DESIGN_SYSTEM.md

---

## 🗑️ Cleanup Policy

**When to add docs here:**
- Roadmaps that are completed
- Status reports that are outdated (>3 months old)
- Implementation logs after feature is live
- Bugfix reports after fix is deployed

**When to DELETE from deprecated/:**
- After 2 years of no reference
- If content is no longer relevant to any team member
- If content contains outdated/incorrect information that could mislead

**Review schedule:** Every 6 months

---

## 📝 Notes

- These docs are **read-only** - don't update them
- If you find useful info here, extract it to a current doc
- If you need to reference history, cite the specific deprecated doc
- Don't link to deprecated docs from current docs (except this README)

---

**Last Cleanup:** 2025-12-16  
**Next Review:** 2025-06-16  
**Maintainer:** DevOps Team
