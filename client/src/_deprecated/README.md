# 🗂️ Deprecated UI Components

**Created:** 2026-01-06  
**Status:** Unused components (detected by Knip)  
**Decision:** See `/docs/DECISIONS_POST_ANCHOR_SPRINT.md`

---

## 🎯 Purpose

This folder contains **UI components and pages** that are no longer referenced in the codebase.

These were moved here instead of deleted to:
- Preserve historical context
- Allow easy restoration if needed
- Maintain git history without clutter

---

## 📂 Contents

### `pages/dashboard/`
Internal dashboard pages that are no longer used:

- `DocumentationInternalPage.jsx` - Old internal documentation page
- `QuickGuideInternalPage.jsx` - Old quick guide page  
- `ReportIssueInternalPage.jsx` - Old issue reporting page
- `UseCasesInternalPage.jsx` - Old use cases page

**Detected by:** Knip static analysis (unused exports)  
**Decision date:** 2026-01-06  
**Moved from:** `client/src/pages/dashboard/`

---

## 🔍 Why Deprecated?

These components were identified as **unused** during the cleanup phase (FASE 1) of the Canonical Contracts Refactor.

**Detection method:**
```bash
npm run deadcode  # Uses Knip
```

**Verification:**
- No imports found in codebase
- No route definitions referencing these
- Not referenced in any navigation menus

---

## 🚫 DO NOT USE

**These components are not maintained.**

If you need similar functionality:
- Check current dashboard implementation
- See `/client/src/pages/dashboard/` for active pages
- Consult `/docs/` for up-to-date documentation

---

## ♻️ Restoration

If you need to restore any of these:

1. **Check if still relevant** - May be outdated
2. **Move back to original location**
3. **Add imports/routes**
4. **Update to current patterns** (TypeScript, hooks, etc.)
5. **Document the restoration decision**

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Files moved | 4 |
| Total size | ~2KB |
| Unused since | Unknown (pre-refactor) |
| Restoration requests | 0 |

---

## ⏭️ Next Steps

**Post-merge evaluation:**
1. If not restored in 2-3 sprints → consider final deletion
2. Extract any valuable patterns/content
3. Document in architecture decisions if deleted

**Until then:** Preserved as-is.

---

## 📚 Related

- **Cleanup summary:** `/CLEANUP_SUMMARY.md`
- **Knip config:** `/knip.json`
- **Decision log:** `/docs/DECISIONS_POST_ANCHOR_SPRINT.md`

---

**Status:** ⏸️ FROZEN - Unused but preserved  
**Merge blocking:** ❌ NO  
**Restoration probability:** 🟡 LOW
