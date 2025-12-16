# 📁 Documentation Reorganization Plan

**Date:** 2025-12-16  
**Purpose:** Clean up docs/ folder, move non-technical docs to deprecated/

---

## 📊 Current Structure Analysis

Total files: 62 markdown files + directories

### ✅ KEEP (Technical/Operational Docs - 20 files)

**Core Architecture & System:**
- [ ] ARCHITECTURE.md (NEW - comprehensive)
- [ ] architecture.md (OLD - review if needed, probably deprecated)
- [ ] TRUST_BOUNDARIES.md (NEW)
- [ ] SIGNATURE_WORKFLOW_ARCHITECTURE.md (Technical, keep)

**Security:**
- [ ] SECURITY_BEST_PRACTICES.md
- [ ] security.md
- [ ] SECURITY_RLS_CHECKLIST.md
- [ ] SECURITY_SIGNATURES.md
- [ ] KEY_ROTATION_PLAN.md
- [ ] audit.md

**Operations:**
- [ ] RUNBOOK.md (NEW)
- [ ] DEPLOYMENT_GUIDE.md (Most complete deployment doc)
- [ ] logging-monitoring-guide.md
- [ ] health-check-setup.md
- [ ] CRON_JOBS_MANAGEMENT.md

**Development:**
- [ ] README.md (Main readme)
- [ ] README_FOR_DEV.md
- [ ] api-reference.md
- [ ] database-schema-analysis.md
- [ ] E2E_TEST_MANUAL.md

**Blockchain Specific:**
- [ ] BITCOIN_ANCHORING_GUIDE.md
- [ ] POLYGON_ANCHORING_SETUP.md
- [ ] README_ANCHORING.md
- [ ] ANCHORING_FLOW.md (Technical flow, keep)

**Integrations:**
- [ ] EMAIL_TEMPLATES_GUIDE.md (Reference for email system)
- [ ] DESIGN_SYSTEM.md (UI reference)

---

### 🗄️ MOVE TO deprecated/ (42 files)

#### deprecated/roadmaps/ (7 files)
- [ ] ROADMAP.md
- [ ] ROADMAP_MVP.md
- [ ] roadmap-infalibilidad-COMPLETADO.md
- [ ] MVP_CHECKLIST_FINAL.md
- [ ] MVP_IMPLEMENTATION_GUIDE.md
- [ ] QUICK_WINS_AUDIT.md
- [ ] DECISIONES_PRODUCTO_WORKFLOW.md

#### deprecated/status-reports/ (8 files)
- [ ] ANCHORING_STATUS_REPORT.md
- [ ] IMPLEMENTATION_STATUS.md
- [ ] MVP_STATUS_AND_NEXT_STEPS.md
- [ ] POLYGON_TEST_RESULTS.md
- [ ] TESTING_ATOMIC_TRANSACTIONS.md
- [ ] SIGNNOW_EMBED_AUDIT.md
- [ ] QUICK_WINS_AUDIT.md
- [ ] code_analysis_summary.md

#### deprecated/implementation-logs/ (15 files)
- [ ] ANCHORING_AUDIT_SUMMARY.md
- [ ] ANCHORING_HARDENING_PR.md
- [ ] POLYGON_ANCHORING_ANALYSIS.md
- [ ] EMAIL_NOTIFICATIONS_IMPLEMENTATION.md
- [ ] EMAIL_SYSTEM_FINAL_REPORT.md
- [ ] CONEXION_REAL_COMPLETADA.md
- [ ] CONFIGURACION_RESEND_COMPLETA.md
- [ ] COMPONENTE_CERTIFICATION_MODAL.md
- [ ] RESUMEN_FINAL_CAMBIOS.md
- [ ] RESUMEN_IMPLEMENTACION_COMPLETA.md
- [ ] dashboard_cleanup.md
- [ ] CAMBIOS_VERIFICADOR.md
- [ ] AUDITORIA_MANDAMIENTOS.md
- [ ] AUDITORIA_UI_MANDAMIENTOS.md
- [ ] RESPUESTAS_INVESTIGADOR.md

#### deprecated/bugfixes/ (5 files)
- [ ] BUGFIX_LOGIN_EMAIL.md
- [ ] DEBUG_LOGIN.md
- [ ] VIDEO_FIX_SUMMARY.md

#### deprecated/misc/ (7 files)
- [ ] COMO_LO_HACEMOS.md (Philosophy doc)
- [ ] EMAIL_TEMPLATES.md (Superseded by EMAIL_TEMPLATES_GUIDE.md)
- [ ] deployment.md (OLD, superseded by DEPLOYMENT_GUIDE.md)
- [ ] DEPLOY_GUIDE.md (Partial, merged into DEPLOYMENT_GUIDE.md)
- [ ] paginas_que_tenias_en_el_tag.md
- [ ] test_notes.md
- [ ] test.txt
- [ ] test2.txt

---

## 🎯 Action Plan

### Phase 1: Create Structure
```bash
mkdir -p deprecated/{roadmaps,status-reports,implementation-logs,bugfixes,misc}
```

### Phase 2: Move Files
```bash
# Roadmaps
mv ROADMAP*.md MVP_*.md QUICK_WINS_AUDIT.md DECISIONES_PRODUCTO_WORKFLOW.md deprecated/roadmaps/

# Status Reports
mv *_STATUS_*.md *_TEST_RESULTS.md TESTING_*.md *_AUDIT_*.md code_analysis_summary.md deprecated/status-reports/

# Implementation Logs
mv *_IMPLEMENTATION*.md *_COMPLETADA.md RESUMEN_*.md deprecated/implementation-logs/
mv COMPONENTE_*.md CAMBIOS_*.md AUDITORIA_*.md RESPUESTAS_*.md deprecated/implementation-logs/
mv dashboard_cleanup.md ANCHORING_HARDENING_PR.md deprecated/implementation-logs/

# Bugfixes
mv BUGFIX_*.md DEBUG_*.md VIDEO_FIX_*.md deprecated/bugfixes/

# Misc
mv COMO_LO_HACEMOS.md EMAIL_TEMPLATES.md deployment.md DEPLOY_GUIDE.md deprecated/misc/
mv paginas_que_tenias_en_el_tag.md test*.md test*.txt deprecated/misc/
```

### Phase 3: Review OLD vs NEW docs
```bash
# Compare and remove if superseded:
diff architecture.md ARCHITECTURE.md
# If ARCHITECTURE.md is comprehensive, move old one to deprecated/misc/
```

### Phase 4: Update Cross-References
Search for broken links in remaining docs and update paths.

### Phase 5: Create README in deprecated/
Document what's in each folder and why it's deprecated.

---

## 📁 Final Structure

```
docs/
├── ARCHITECTURE.md              # ✅ NEW comprehensive
├── TRUST_BOUNDARIES.md          # ✅ NEW detailed
├── RUNBOOK.md                   # ✅ NEW operational
├── DEPLOYMENT_GUIDE.md          # ✅ Keep (most complete)
├── SECURITY_*.md                # ✅ Keep (4 files)
├── KEY_ROTATION_PLAN.md         # ✅ Keep
├── README*.md                   # ✅ Keep (3 files)
├── *_ANCHORING_*.md             # ✅ Keep (3 technical guides)
├── SIGNATURE_WORKFLOW_ARCHITECTURE.md  # ✅ Keep
├── EMAIL_TEMPLATES_GUIDE.md     # ✅ Keep
├── DESIGN_SYSTEM.md             # ✅ Keep
├── logging-monitoring-guide.md  # ✅ Keep
├── health-check-setup.md        # ✅ Keep
├── CRON_JOBS_MANAGEMENT.md      # ✅ Keep
├── api-reference.md             # ✅ Keep
├── database-schema-analysis.md  # ✅ Keep
├── E2E_TEST_MANUAL.md           # ✅ Keep
├── audit.md                     # ✅ Keep
├── security.md                  # ✅ Keep
│
├── architecture/                # Existing folder (keep)
│   └── EVM_GENERIC_ANCHORING.md
│
├── assets/                      # Images, diagrams (keep)
│
└── deprecated/
    ├── README.md                # Explains what's here
    ├── roadmaps/                # 7 files
    ├── status-reports/          # 8 files
    ├── implementation-logs/     # 15 files
    ├── bugfixes/                # 5 files
    └── misc/                    # 7 files
```

---

## ✅ Benefits

1. **Clarity:** Only 20-25 current, relevant docs in main folder
2. **Maintenance:** Deprecated docs preserved but not cluttering
3. **Onboarding:** New devs see only what matters
4. **History:** Old docs available for reference if needed
5. **Audit-ready:** Clear separation of specs vs. logs

---

## 🚀 Execution

Run reorganization script:
```bash
cd /home/manu/dev/ecosign
./scripts/reorganize-docs.sh
```

Or manual commands as listed in Phase 2.

---

**Approval needed before execution.**
