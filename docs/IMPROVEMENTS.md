# Corrections Roadmap — Pomodoroz

> 上游路线图参考，冻结保留，不作为本地「规划工作台」任务清单。旧版本、OpenSpec 流程及历史状态不代表本机结果。本地长期方向见 `../PROJECT.md`，唯一当前任务见 `../TASK.md`，执行结果见 `../STATUS.md`；仅涉及对应模块时按需参考下文。

> Single source of truth for open corrections and operational hardening.
>
> Implemented work belongs in `CHANGELOG.md` / `CHANGELOG.pt.md`. Historical
> evidence belongs in audit reports and OpenSpec changes. Product ideas are
> retained only as deferred backlog below.

## Current Direction

The project is in a correction-first cycle. Work that changes code, data,
pipelines, or verifiable runtime behavior requires an OpenSpec change before
implementation. New dependencies still require an explicit impact review.

The active published baseline is `26.7.2`. The next unreleased changelog
sections are `TBD` / `A definir`.

## Active Corrections

### P0 — Security and Release Integrity

| ID  | Correction                                                                   | Status | Next action                                       |
| --- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| C2  | Pin release actions and Linux AppImage tooling; verify downloaded checksums  | Open   | Create a release supply-chain OpenSpec change.    |
| C3  | Require release admission checks for tag, manifests, both changelogs, and CI | Open   | Create a release admission OpenSpec change.       |
| C4  | Keep releases private until all platform assets and `latest.json` validate   | Open   | Include draft-to-publish flow in the same change. |

### P1 — Local Data and Core Behavior

| ID  | Correction                                                           | Status | Next action                                        |
| --- | -------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| C5  | Validate persisted `state` and `statistics` schemas before hydration | Open   | Create a local-state resilience OpenSpec change.   |
| C6  | Apply the latest auto-update preference when a check is in flight    | Open   | Create an updater policy OpenSpec change.          |
| C9  | Do not reset an active timer when unrelated duration settings change | Open   | Include in the timer/task regression change.       |
| C10 | Report native notification-audio failures and bound playback work    | Open   | Create a notification reliability OpenSpec change. |

### P2 — Cross-Platform and Operational Reliability

| ID  | Correction                                           | Status | Next action                                                        |
| --- | ---------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| C11 | Add macOS CI coverage and verify declared Rust MSRV  | Open   | Create a CI compatibility OpenSpec change.                         |
| C13 | Keep upstream version and release references current | Open   | Upstream item; local handoff is maintained only in `../STATUS.md`. |

### P3 — Regression Prevention and Maintenance

| ID  | Correction                                                                                                                      | Status | Next action                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| C14 | Protect documented storage-corruption, statistics-persistence, timer-transition, and task-selection regressions still uncovered | Open   | Extend existing tests where possible; add a test only for a concrete uncovered regression. |
| C15 | Restore justified lint coverage for unused code and resource cleanup                                                            | Open   | Audit disabled rules before changing their severity.                                       |
| C17 | Correct remaining operational documentation drift and platform prerequisites                                                    | Open   | Address with the related correction, not as a standalone history rewrite.                  |

## Execution Order

1. Secure release supply chain and release admission (C2-C4).
2. Protect local data and updater behavior (C5-C6).
3. Correct timer and notification regressions (C9-C10).
4. Add cross-platform CI and operational controls (C11, C13).
5. Expand regression prevention and correct remaining documentation drift (C14-C15, C17).

## Deferred Product Backlog

These items are intentionally deferred while corrections remain active. They
are not approved implementation work and must be reprioritized explicitly.

| ID  | Feature                            |
| --- | ---------------------------------- |
| B2  | Cadence presets                    |
| B4  | Break suggestion prompts           |
| B5  | Global play/pause hotkey           |
| B6  | Cadence insights in statistics     |
| B7  | Motivational completion messages   |
| B8  | Ambient sounds                     |
| B9  | No-judgment mode                   |
| B11 | Optional window focus on timer end |

## Document Boundaries

- `CHANGELOG.md` / `CHANGELOG.pt.md`: implemented and released changes.
- `docs/AUDITORIA_*.md`: historical evidence; not an active checklist.
- `openspec/changes/`: traceable scope, requirements, design, and tasks for
  operational changes.
- `docs/RELEASE_OPERATIONS.md` and `docs/VERSIONS.md`: current release and
  version operations.
- `../STATUS.md`: local current-task handoff; retired upstream RETOMADA history remains in Git.
- `docs/decisions/ADR-0001-correction-first-roadmap.md`: rationale for this
  correction-first structure.
