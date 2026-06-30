# AI Review Tool Workspace Design

Date: 2026-06-30
Project: `apps/web-antd`

## Goal

Add an independent AI review tool workspace route without changing the existing wizard routes:

- Existing routes stay available: `/review/tool/compare`, `/review/tool/audit`, `/review/tool/redact`.
- New route: `/review/tool/workspace`.
- The new route starts with three centered tool cards: attachment compare, content audit, and file redact.
- Clicking a card opens the matching workspace in the same route and does not navigate to the step wizard pages.

## User Flows

### Entry

`/review/tool/workspace` shows three colored cards in the center of the page:

- Attachment Compare
- Content Audit
- File Redact

Each card switches the local workspace mode. A back action returns to the card entry state.

### Attachment Compare

The workspace shows a viewer-style surface with two upload panes:

- Left: upload base file.
- Right: upload compare file.

Top-right actions:

- Import Project
- Export Project
- Start Compare, then Recompare after a task exists

On start, create an `ATTACHMENT_COMPARE` task through `toolCreateAndExecute`, poll `getToolResult`, show loading while the task is pending/running, and render the existing `FileDiffViewer` when the result is `SUCCESS`.

### Content Audit

The workspace shows a single document upload area plus review controls:

- Upload file in the center.
- Select review rules.
- Optional reference values can be left empty.

Top-right actions:

- Import Project
- Export Project
- Start Audit, then Reaudit after a task exists

On start, create a `CONTENT_AUDIT` task, poll `getToolResult`, show loading, and render the existing `ContentAuditViewer` when the result is `SUCCESS`.

### File Redact

File redact uses the same single-document workspace shape as content audit:

- Upload file in the center.
- Select focus points.

Top-right actions:

- Import Project
- Export Project
- Start Redact, then Reredact after a task exists

On start, create a `FILE_REDACT` task, poll `getToolResult`, show loading, and render `ContentAuditViewer` in redact mode when the result is `SUCCESS`.

## Architecture

Implement a new workspace page under `apps/web-antd/src/views/review/tool/workspace/index.vue`.

Reuse existing components and APIs:

- `SingleFileUpload` for uploads and Word-to-PDF conversion.
- `StandardPicker` for content audit rule selection.
- `ReferenceEditor` for optional content audit reference values.
- `FocusPointPicker` for file redact focus selection.
- `FileDiffViewer` for attachment compare results.
- `ContentAuditViewer` for content audit and file redact results.
- `toolCreateAndExecute` and `getToolResult` for task lifecycle.
- `reviewTaskExport` and `reviewTaskImport` for project package export/import.

Keep result viewers mostly untouched. The new page composes them from the outside instead of adding upload/start controls inside viewer internals.

## Project Import And Export

Each workspace mode exposes Import Project and Export Project buttons.

- Import accepts a `.zip` project package, calls `reviewTaskImport`, and opens the first returned task result in the current workspace if possible.
- Export requires a completed or existing task in the current workspace, calls `reviewTaskExport([taskId])`, and downloads the generated zip.
- If there is no current task to export, show a warning.

## Polling And Error Handling

- Poll every 5 seconds while the task is not complete.
- Stop polling on unmount/deactivation.
- `SUCCESS` renders the viewer.
- `FAIL` shows a concise failure state with retry available.
- Upload or missing configuration errors are shown with Ant Design Vue messages.

## Routing

The new route must be available by path `/review/tool/workspace`.

Because this app primarily receives menu routes from the backend, the page component should also be reachable when a backend menu points to component `review/tool/workspace/index`.

Task-list shortcuts for creating new tool tasks will open the new workspace. Existing history result viewing remains on the current wizard-result routes.

## Verification

Manual verification:

- Open `/review/tool/workspace`.
- Switch between all three cards and back to entry.
- Upload required files and validate disabled/enabled start actions.
- Submit one compare task, one audit task, and one redact task against the existing backend.
- Confirm loading, success viewer, failure state, and re-run buttons.
- Confirm project export warns before a task exists and downloads after a task exists.
- Confirm project import accepts zip and opens an imported task result.

Automated verification:

- Run the app typecheck or build command used by this repo if available.
- Run lint for touched frontend files if available.
