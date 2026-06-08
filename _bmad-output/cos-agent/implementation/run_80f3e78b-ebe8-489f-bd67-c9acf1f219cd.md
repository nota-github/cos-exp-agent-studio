# Implementation Run: story-2.1 — Project CRUD REST API

**Run ID:** run_80f3e78b-ebe8-489f-bd67-c9acf1f219cd
**Date:** 2026-06-08
**Story:** story-2.1 | epic-2 | Project CRUD REST API

---

## Selected Story

**story-2.1: Project CRUD REST API**
Expose REST endpoints for registering, listing, and deleting projects so the frontend can manage projects backed by persistent SQLite storage.

---

## Quality Plan

| Criterion | Code Evidence | Status |
|-----------|--------------|--------|
| POST valid → 201 with id | INSERT + SELECT back by id, return 201 | Implemented |
| POST non-existent path → 400 "경로가 존재하지 않습니다" | `existsSync(normalizedPath)` guard | Implemented |
| POST duplicate path → 409 | SELECT before INSERT, return 409 if exists | Implemented |
| GET → array (empty if none) | SELECT all, `.all()` returns `[]` by default | Implemented |
| DELETE removes record | DELETE WHERE id + 204 | Implemented |
| Zod validation; missing fields → 400 with field errors | `CreateProjectSchema.safeParse` + `flatten().fieldErrors` | Implemented |
| Path traversal prevention | `path.resolve` normalization + `isAbsolute` check | Implemented |

**Build validation:** `npm run build` → exit 0 (both client and server compiled clean)

---

## In Scope for This Run

- `packages/server/src/routers/projectRouter.ts` — new file; GET / POST / DELETE at `/api/projects`
- `packages/server/src/app.ts` — added projectRouter import and mount at `/api/projects`

---

## Deferred Work

- **story-2.2:** Filesystem API (browse directories) — depends only on story-1.2, can run in parallel
- **story-2.3:** ProjectInboxView — frontend story depends on story-2.1 (now complete) + story-1.3 (complete)
- **PUT /api/projects/:id** — not required by story-2.1 acceptance criteria; defer to later story if needed
- **Cascade delete:** The current schema has `executions.project_id REFERENCES projects(id)` with `foreign_keys = ON`. Deleting a project with existing executions will fail with a foreign key constraint error. This is acceptable for story-2.1 scope since no executions exist yet; cascade handling should be added before story-3.x delivers execution creation.

---

## Validation Performed

| Validation | Command | Result |
|------------|---------|--------|
| Build | `npm run build` | exit 0 — client + server both compiled clean |

---

## Design Compliance Notes

**Status:** not_applicable — story-2.1 is a pure backend REST API story with no UI changes.

---

## Design Differentiation Notes

**Status:** not_applicable — no UI or user flow changes in this story.

---

## Outcome Quality Notes

- **Purpose clarity:** not_applicable (backend only)
- **Primary action:** POST /api/projects with name+path registration
- **State/copy handling:** Error messages are in Korean matching the acceptance criteria spec ("경로가 존재하지 않습니다", "이미 등록된 경로입니다", "프로젝트를 찾을 수 없습니다")
- **Visible quality choices:** Path normalization via `resolve()` prevents traversal attacks; `isAbsolute` check prevents relative paths from slipping through after resolution
- **Remaining weak spots:** Cascade delete not implemented (safe for current scope; no executions exist); no PATCH/PUT endpoint (not in story-2.1 scope)

---

## Structured Assessment

```json
{
  "success_criteria_status": {
    "POST_valid_201": "pass",
    "POST_nonexistent_path_400": "pass",
    "POST_duplicate_409": "pass",
    "GET_returns_array": "pass",
    "DELETE_removes_record_204": "pass",
    "zod_validation_400_field_errors": "pass",
    "path_traversal_prevention": "pass"
  },
  "story_completion_status": "complete",
  "mvp_acceptance_status": "pass",
  "release_evidence_status": "build_pass",
  "package_readiness_status": "ready",
  "remaining_required_story_keys": [
    "story-2.2", "story-2.3", "story-3.1", "story-3.2", "story-3.3",
    "story-3.4", "story-4.1", "story-4.2", "story-4.3", "story-4.4",
    "story-5.1", "story-5.2", "story-5.3", "story-5.4", "story-6.1",
    "story-6.2", "story-6.3", "story-6.4", "story-7.1", "story-7.2",
    "story-7.3", "story-7.4", "story-7.5"
  ],
  "next_story_candidates": [
    "story-2.2 (Filesystem API — no new deps)",
    "story-2.3 (ProjectInboxView — depends on story-2.1 now complete + story-1.3 complete)"
  ],
  "risks": [
    "Cascade delete for project with existing executions will return SQLite FK constraint error — safe now (no executions), needs handling before story-3.x delivers execution creation",
    "GUIDED_VERIFICATION_REQUIRED items from prior stories still unresolved (live browser routes, WS reconnect)"
  ]
}
```
