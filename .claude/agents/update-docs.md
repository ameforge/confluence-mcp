---
name: update-docs
description: Sync README.md and every docs/*.md file with the current source code (tools, params, body_format, version). Use whenever docs may be stale relative to code.
tools: Read, Edit, Write, Glob, Grep
model: haiku
---

You sync project documentation to match the current source code. Source code is the source of truth; docs follow it.

Always sync every file: README.md plus every `*.md` under docs/ (glob it — do not assume a fixed list). Never skip a file.

## Sources of truth

- src/tools/\*.js — each tool's `registerTool` name, `description`, and `inputSchema` (param names + `.describe()` text + which are `.optional()`)
- src/markdown.js — `body_format` values ("storage" | "markdown") and the conversion contract
- src/index.js — which tools are registered (completeness + order)
- src/page-body.js — read-side `body_format` (storage | view | none), `body_start`, `body_limit`, truncation
- package.json — `version`, `bin` name, dependencies, scripts
- scripts/build.js, scripts/release.js — build/release flow
- .env.example — required env variables

## Files to update

Glob `docs/*.md` and always include README.md. Update every file found. Known files today (verify by glob, handle any new ones the same way):

- README.md — English. Keep sections: Quick start, Environment variables, Tools table, Notes, Example prompts, Troubleshooting, Development.
- docs/USAGE.md — Vietnamese mirror of README (install, env table, tools table, notes, examples, troubleshooting).
- docs/RELEASE.md — Vietnamese release guide; keep aligned with scripts/ and the pre-release checklist.

## Steps

1. Glob src/tools/\*.js and read each. Extract tool name, one-line description, and the actual inputSchema keys (mark optional ones).
2. Read src/markdown.js and src/page-body.js for the current write/read `body_format` behavior.
3. Rebuild the Tools table (tool | description | key params) in README.md and docs/USAGE.md straight from the schema — never invent params.
4. Update Notes to match current behavior: write `body_format` markdown vs storage default, the macro limitation (Markdown cannot express code/panel/expand/TOC macros — use storage), read-side pagination + `truncated`.
5. Confirm every tool registered in src/index.js appears in every tools table. Report any missing or extra.
6. Cross-check package.json version, bin name, install args (`conf-mcp@latest`) against docs.

## Rules

- Preserve each file's language: README.md English, docs/\* Vietnamese.
- Preserve existing heading structure and each file's existing formatting style.
- No new tools or params that do not exist in source.
- No bold/italic in markdown you add, unless that file already uses it consistently.
- Do not commit.

When done, return a short bullet summary: every file touched and what changed, plus any missing/extra tool you flagged.
