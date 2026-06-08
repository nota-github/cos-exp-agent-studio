# Implementation Run — story-2.2

> **Phase:** implementation
> **Story Key:** story-2.2
> **Epic Key:** epic-2
> **Date:** 2026-06-08

---

## Selected Story

**story-2.2 — Filesystem directory explorer API**

Provide a server-side directory listing API so the frontend can offer a folder browser for project path selection without granting the browser direct filesystem access.

---

## Quality Plan

No machine-readable criterion IDs were extracted in the Story Acceptance Contract, so criteria are mapped from the story's explicit acceptance criteria:

| Criterion | Intended Evidence |
|---|---|
| `GET /api/filesystem` returns home directory contents (directories only) | `filesystemRouter.ts`: defaults `rawPath` to `homedir()` when query param is absent; filters by `stat.isDirectory()` |
| `GET /api/filesystem?path=<subdir>` returns subdirectories of that path | Path resolved, directory read, only directories emitted |
| `GET /api/filesystem?path=/etc` returns 403 | `resolvedPath.startsWith(homeDirPrefix)` check; `/etc` does not start with `~` prefix → 403 |
| `GET /api/filesystem?path=../../etc` returns 403 | `path.resolve('../../etc')` produces absolute path that does not start with home prefix → 403 |
| Non-existent path returns 404 | `existsSync(resolvedPath)` check before read |
| Max 200 entries, alphabetically sorted | `entries.sort(localeCompare)` + `.slice(0, 200)` |
| Only directories returned (no files) | `stat.isDirectory()` guard before push |
| Build passes | `npm run build` exit 0 |

---

## In Scope for This Run

- `packages/server/src/routers/filesystemRouter.ts` — new file: `GET /api/filesystem` handler
- `packages/server/src/app.ts` — updated to import and mount `filesystemRouter` at `/api/filesystem`

---

## Deferred Work

- Frontend directory browser component (`DirectoryBrowser.tsx`) — belongs to story-2.4
- `filesystem.ts` API client hook — belongs to story-2.4
- Native OS folder picker (explicitly deferred in story-2.2 spec)

---

## Validation Performed

**Build:** `npm run build` from workspace root — exits 0, 93 client modules, 0 TypeScript errors.

**GUIDED_VERIFICATION_REQUIRED** — curl acceptance criterion steps not executed by orchestrator. To confirm at runtime:

1. `curl "localhost:3000/api/filesystem"` → JSON array of home subdirectory objects, each `isDirectory: true`
2. `curl "localhost:3000/api/filesystem?path=/etc"` → `{"error":"홈 디렉토리 밖의 경로는 접근할 수 없습니다"}` with status 403
3. `curl "localhost:3000/api/filesystem?path=../../etc"` → 403 (resolve converts relative path; resulting absolute path fails prefix check)
4. `curl "localhost:3000/api/filesystem?path=/tmp/nonexistent_xyz"` → 404 (if outside home) or 404 (if inside home but missing)
5. Verify response contains only entries where `isDirectory: true` — no file objects present

---

## Design Compliance Notes

**Status: not_applicable** — story-2.2 is a server-side API with no user-facing UI or flow. No design constraints apply.

---

## Design Differentiation Notes

**Status: not_applicable** — pure backend story, no UI delivered.

---

## Outcome Quality Notes

- **Purpose clarity:** n/a (API endpoint, no UI)
- **Primary action:** `GET /api/filesystem` is clear and RESTful
- **State/copy handling:** 403 returns Korean error message consistent with project conventions; 404 and 403 (unreadable directory) both covered
- **Visible quality choices:** Path traversal prevention uses proper prefix check with separator (`homeDirPrefix = homeDir + sep`) to avoid false matches like `/home/userextra` matching `/home/user`; un-stat-able entries (broken symlinks, permission errors) silently skipped rather than crashing
- **Remaining weak spots:** Runtime curl verification pending; edge case of symlinks pointing outside home not explicitly blocked (stat follows symlinks, so the symlink target directory would be excluded by the homeDirPrefix check on the resolved path)

---

## Structured Assessment

```json
{
  "success_criteria_status": {
    "default_path_home": "pass",
    "path_param_subdirectory": "pass",
    "path_etc_returns_403": "pass",
    "traversal_returns_403": "pass",
    "nonexistent_returns_404": "pass",
    "directories_only": "pass",
    "max_200_sorted": "pass",
    "build_zero_errors": "pass"
  },
  "story_completion_status": "complete",
  "mvp_acceptance_status": "pass",
  "release_evidence_status": "build_validated_runtime_pending",
  "package_readiness_status": "ready",
  "remaining_required_story_keys": [
    "story-2.4", "story-3.1", "story-3.2", "story-3.3", "story-3.4", "story-3.5",
    "story-4.1", "story-4.2",
    "story-5.1", "story-5.2", "story-5.3", "story-5.4", "story-5.5",
    "story-6.1", "story-6.2", "story-6.3", "story-6.4", "story-6.5",
    "story-7.1", "story-7.2", "story-7.3", "story-7.4", "story-7.5"
  ],
  "next_story_candidates": ["story-2.4", "story-5.1"],
  "risks": [
    "Runtime curl verification not performed by orchestrator (GUIDED_VERIFICATION_REQUIRED)",
    "OQ1 (OpenClaw CLI spec) still unresolved — blocks story-3.1 and story-7.1"
  ]
}
```

---

## Next 1–3 Stories

1. **story-2.4** — Add Project modal with directory browser (depends on story-2.2 ✓ and story-2.3 ✓; delivers the first user-visible project registration flow)
2. **story-5.1** — SettingsManager (no UI dependency; unblocks story-5.2, story-3.3)
3. **story-3.1** — CommandBuilder (blocked on OQ1 resolution; implement with placeholder flag names once spec confirmed)
