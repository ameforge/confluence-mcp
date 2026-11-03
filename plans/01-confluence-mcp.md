# Confluence MCP Server — Implementation Plan

## Context

conf-mcp is a scaffold copy of the working jira-mcp server (D:\ws\lab\jira-mcp) — same package.json, tsconfig.json, biome.json, scripts/build.js, scripts/release.js (hash-verified identical). src/ is empty. Goal: implement an MCP server for the companion Confluence instance, mirroring jira-mcp's architecture exactly rather than inventing new conventions.

Confirmed target (live-probed, cross-checked by two independent methods):
- Host: https://conf.gem-corp.tech
- Product: Confluence Server/Data Center 6.11.0, build 7801 (confirmed via `ajs-version-number` meta tag on the login page — not inferred)
- REST API base: https://conf.gem-corp.tech/rest/api (root context path, no `/wiki` prefix, no Cloud v2 surface — `/wiki/api/v2/spaces` returns 404)
- Auth: HTTP Basic with plain username + password (Personal Access Tokens require Confluence 7.9+; this host is 6.11.0, so PATs are not an option)

## Phase 0 — Documentation discovery (complete)

### Allowed APIs — jira-mcp patterns to copy verbatim

Source: full read of every file in D:\ws\lab\jira-mcp\src.

| Pattern                                                                    | Copy from                                  |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| Server bootstrap (imports, construction, registration, transport, connect) | jira-mcp/src/index.js:1-28                 |
| Shared HTTP client (auth header, base URL, request/error wrapper)          | jira-mcp/src/jira-client.js:1-31           |
| Simple tool template (one required field)                                  | jira-mcp/src/tools/get-ticket.js:1-42      |
| Complex tool template, many optional fields                                | jira-mcp/src/tools/create-ticket.js:1-75   |
| Complex tool template, read-then-write update                              | jira-mcp/src/tools/update-ticket.js:1-99   |
| Shared try/catch to `{content,isError}` block (identical in all 9 files)   | jira-mcp/src/tools/get-ticket.js:36-38     |
| `.default()` usage on a zod field                                          | jira-mcp/src/tools/search-tickets.js:15-19 |

Exact facts to replicate, not reinterpret:
- SDK imports are subpath-specific: `import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"` and `import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js"` (index.js:1-2).
- `new McpServer({name, version})` — no `capabilities` key used.
- Each tool file exports one `registerX(server)` function; index.js imports all of them and calls each explicitly (index.js:15-23) — not a loop over an array.
- `server.registerTool(name_snake_case, {description, inputSchema}, handler)` — 3 positional args.
- `inputSchema` is authored as `z.object({...})`, fields use `.describe()`, optional fields use `.optional()`, arrays use `z.array(z.string())`, defaults use `.default(...)`. No `z.enum()` anywhere — enum-like fields are `z.string()` with valid values spelled out in `.describe()`. Match this; do not introduce `z.enum()`.
- Handler success: `return {content: [{text, type: "text"}]}`.
- Handler failure: every one of the 9 tool files wraps its body in an identical try/catch: `catch (err) { return {content: [{text: err.message, type: "text"}], isError: true}; }`. Copy this verbatim into every new tool.
- `console.error` for the startup log line, never `console.log` — stdout is the MCP protocol channel (index.js:27, README.md:100).
- No startup env-var validation anywhere in jira-mcp (confirmed by grep — zero `process.exit` calls in src/). Failure is lazy: a missing env var flows into the URL/auth string and surfaces as a raw fetch error on first use. Replicate this for consistency with the sibling project — do not add a startup validation check silently.
- jira-client.js resolves `.env` relative to its own file location (`../.env` from `src/`), not `process.cwd()` (jira-client.js:1-6). The new confluence-client.js must live at the same depth (`src/confluence-client.js`) for the same relative path to work.

### Allowed APIs — Confluence Server/Data Center REST API

Source: developer.atlassian.com/server/confluence/\* and docs.atlassian.com/atlassian-confluence/REST/6.6.0/ (closest pinned-version doc to the live 6.11.0 host — the "latest" reference at developer.atlassian.com/server/confluence/rest/ is a JS-rendered Swagger UI that could not be scraped for field-level detail). Live-probed and cross-checked directly against https://conf.gem-corp.tech from this machine.

| Operation               | Method + path                                                           | Key fields                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Get page by ID          | `GET /content/{id}?expand=body.storage,version,space,ancestors`         | body not returned unless expanded                                                                                                                      |
| Get page by space+title | `GET /content?spaceKey={key}&title={title}&expand=body.storage,version` | `type` defaults to `page`                                                                                                                              |
| Search (CQL)            | `GET /content/search?cql={query}&start=&limit=`                         | fields: `space,title,type,text,label,creator,created,lastmodified,ancestor,parent`; operators `= != ~ !~ > >= < <= IN`; keywords `AND OR NOT ORDER BY` |
| Create page             | `POST /content`                                                         | `{type:"page", title, space:{key}, body:{storage:{value, representation:"storage"}}, ancestors:[{id}]?}`                                               |
| Update page             | `PUT /content/{id}`                                                     | same shape plus `version:{number: current+1}` — must increment or the request is rejected                                                              |
| Delete page             | `DELETE /content/{id}`                                                  | trash step returns 200, permanent purge (second call with `?status=trashed`) returns 204                                                               |
| List/get spaces         | `GET /space` or `GET /space/{key}`                                      | list envelope: `{results,start,limit,size,_links}` (live-confirmed exact shape)                                                                        |
| Get comments            | `GET /content/{id}/child/comment?expand=body.view`                      |                                                                                                                                                        |
| Add comment             | `POST /content`                                                         | `{type:"comment", container:{id,type:"page"}, body:{storage:{...}}}` — no dedicated comment endpoint                                                   |
| Get labels              | `GET /content/{id}/label`                                               |                                                                                                                                                        |
| Add labels              | `POST /content/{id}/label`                                              | body is a JSON array: `[{prefix:"global", name}]`                                                                                                      |
| List/add attachments    | `GET`/`POST /content/{id}/child/attachment`                             | POST is multipart/form-data, requires header `X-Atlassian-Token: nocheck`                                                                              |

Confirmed anti-patterns / gotchas (do not skip these):
1. Reads return a bare skeleton unless `expand` is passed. `GET /content/{id}` alone omits body, version, and space. Every read tool must pass an explicit `expand`.
2. Update requires the full representation plus an incremented `version.number`, not a partial patch. Sending the current (unincremented) version number is documented to fail — community-attested as 409, not stated in primary docs, so treat the increment rule as certain and the exact status code as needing a smoke test.
3. Page/comment bodies use Confluence storage format (an XHTML-like dialect), set via `representation:"storage"` — not Markdown. Tool descriptions must say this explicitly so a caller doesn't pass raw Markdown.
4. Confluence Cloud's `/wiki/api/v2/...` surface and cursor pagination do not apply here — confirmed absent (404) on this host. Use `start`/`limit`/`_links.next` pagination only.
5. Auth is `username:password` Basic, not Cloud's `email:api_token` — env vars must be `CONFLUENCE_USERNAME`/`CONFLUENCE_PASSWORD`.
6. Attachment upload needs `X-Atlassian-Token: nocheck` and multipart/form-data — it cannot go through a JSON-only request helper unmodified.

Gaps flagged by research, to be resolved by smoke test rather than assumption:
- Exact status code on stale-version update (assume 409, verify against the real host).
- Whether DELETE-to-trash returns a JSON body on its 200 response, or an empty body (see Phase 2 guard below).
- Whether the comment `container` object needs `type:"page"` or `id` alone (include `type` defensively, verify).

## Phase 1 — Scaffold conversion, shared client, first tool (spike)

What to implement:
1. `package.json`: change `"name": "jira-mcp"` to `"name": "conf-mcp"` (D:\ws\lab\conf-mcp\package.json:2). This matters because scripts/release.js:9 derives the release zip filename from `pkg.name` — leaving it unchanged would ship a zip named `jira-mcp-v1.0.0.zip`.
2. `.env.example`: replace contents entirely —

   ```
   CONFLUENCE_HOST=https://conf.gem-corp.tech
   CONFLUENCE_USERNAME=your_username
   CONFLUENCE_PASSWORD=your_password
   ```

   Drop `JIRA_START_DATE_FIELD` — no Confluence equivalent.
3. `.env` (local, gitignored, not committed): add real `CONFLUENCE_HOST`/`CONFLUENCE_USERNAME`/`CONFLUENCE_PASSWORD` values. Do not remove the existing JIRA*\* keys if this .env is shared with other tooling — just add the CONFLUENCE*\* keys alongside them.
4. `src/confluence-client.js` — copy jira-mcp/src/jira-client.js:1-31 structure exactly:

   ```js
   import { dirname, resolve } from "node:path";
   import { fileURLToPath } from "node:url";
   import dotenv from "dotenv";

   const __dirname = dirname(fileURLToPath(import.meta.url));
   dotenv.config({ path: resolve(__dirname, "../.env") });

   const BASE = `${process.env.CONFLUENCE_HOST}/rest/api`;
   const AUTH = Buffer.from(
     `${process.env.CONFLUENCE_USERNAME}:${process.env.CONFLUENCE_PASSWORD}`,
   ).toString("base64");
   const HEADERS = {
     Accept: "application/json",
     Authorization: `Basic ${AUTH}`,
     "Content-Type": "application/json",
   };

   export const confluenceRequest = async (method, path, body) => {
     const res = await fetch(`${BASE}${path}`, {
       body: body ? JSON.stringify(body) : undefined,
       headers: HEADERS,
       method,
     });
     if (!res.ok) {
       const text = await res.text();
       throw new Error(`Confluence API ${res.status}: ${text}`);
     }
     if (res.status === 204) return null;
     return res.json();
   };
   ```

   No base path version segment — Confluence uses `/rest/api` directly, unlike Jira's `/rest/api/2`.

5. `src/tools/get-page.js` — first tool, mirrors jira-mcp/src/tools/get-ticket.js:1-42:

   ```js
   import { z } from "zod";
   import { confluenceRequest } from "../confluence-client.js";

   export const registerGetPage = (server) => {
     server.registerTool(
       "get_page",
       {
         description:
           "Get full details of a Confluence page by its numeric content ID",
         inputSchema: z.object({
           page_id: z
             .string()
             .describe("Confluence page/content ID, e.g. 123456"),
         }),
       },
       async ({ page_id }) => {
         try {
           const page = await confluenceRequest(
             "GET",
             `/content/${page_id}?expand=body.storage,version,space,ancestors`,
           );
           return {
             content: [{ text: JSON.stringify(page, null, 2), type: "text" }],
           };
         } catch (err) {
           return {
             content: [{ text: err.message, type: "text" }],
             isError: true,
           };
         }
       },
     );
   };
   ```

6. `src/index.js` — mirrors jira-mcp/src/index.js:1-28, registering only `get_page` for this phase:

   ```js
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
   import { registerGetPage } from "./tools/get-page.js";

   const server = new McpServer({ name: "conf-mcp", version: "1.0.0" });

   registerGetPage(server);

   const transport = new StdioServerTransport();
   await server.connect(transport);
   console.error("Confluence MCP server running on stdio");
   ```

Verification checklist:
- `pnpm install` succeeds.
- `pnpm run lint` (biome check --write . && tsc --noEmit) — zero errors, zero warnings.
- `pnpm run build` (esbuild) succeeds, produces `dist/index.js`.
- Credential-free checks (no CONFLUENCE_USERNAME/PASSWORD needed): `curl https://conf.gem-corp.tech/status` returns `{"state":"RUNNING"}`; `curl https://conf.gem-corp.tech/rest/api/space` returns a 200 JSON envelope. Both already confirmed in this plan's research — re-run only if the host's availability is in question.
- Authenticated smoke test (blocked on the user supplying real CONFLUENCE_USERNAME/CONFLUENCE_PASSWORD in .env — this cannot be completed without them): register conf-mcp with an MCP client (same way jira-mcp is registered), call `get_page` against a real page ID, and confirm the response contains `body.storage.value`. This is also the check for whether `server.registerTool`'s `inputSchema` accepts a `z.object({...})` wrapper as jira-mcp uses it — if it does not, jira-mcp has the same latent issue and both should be fixed the same way (unwrap to a raw shape object), not just this one.

Anti-pattern guards:
- Do not add a startup env-var validation block — jira-mcp has none; match it.
- Do not invent a `capabilities` option on `McpServer` — jira-mcp doesn't pass one.
- Do not skip `expand` on the GET — without it the response has no body/version/space.

## Phase 2 — Core content lifecycle: create, update, delete

What to implement:

`src/tools/create-page.js` (registerCreatePage, tool name `create_page`):

```js
inputSchema: z.object({
  body: z.string().describe("Page content in Confluence storage format (XHTML), not Markdown"),
  parent_page_id: z.string().optional().describe("Content ID of the parent page, if nesting under one"),
  space_key: z.string().describe("Confluence space key, e.g. ENG"),
  title: z.string().describe("Page title"),
}),
```

Handler builds:

```js
const payload = {
  body: {storage: {representation: "storage", value: body}},
  space: {key: space_key},
  title,
  type: "page",
};
if (parent_page_id) payload.ancestors = [{id: parent_page_id}];
const created = await confluenceRequest("POST", "/content", payload);
```

Source: developer.atlassian.com/server/confluence/confluence-rest-api-examples/ (payload shape), docs.atlassian.com/atlassian-confluence/REST/6.6.0/ (field requirements).

`src/tools/update-page.js` (registerUpdatePage, tool name `update_page`). Confluence's PUT is a full replace, not a patch, and requires the current version + 1. Read-modify-write, following the pattern in jira-mcp/src/tools/update-ticket.js:1-99 but adapted because Confluence forces the full body on every write, unlike Jira's field-level PATCH:

```js
inputSchema: z.object({
  body: z.string().optional().describe("New page content in Confluence storage format; omit to keep existing content"),
  page_id: z.string().describe("Confluence page/content ID to update"),
  title: z.string().optional().describe("New title; omit to keep existing title"),
}),
```

```js
const current = await confluenceRequest(
  "GET",
  `/content/${page_id}?expand=version,space,body.storage`,
);
const payload = {
  body: {
    storage: {
      representation: "storage",
      value: body ?? current.body.storage.value,
    },
  },
  id: page_id,
  space: {key: current.space.key},
  title: title ?? current.title,
  type: "page",
  version: {number: current.version.number + 1},
};
const updated = await confluenceRequest("PUT", `/content/${page_id}`, payload);
```

Source for the increment requirement: docs.atlassian.com/atlassian-confluence/REST/6.6.0/ — "To update a piece of content you must increment the version.number, supplying the number of the version you are creating."

`src/tools/delete-page.js` (registerDeletePage, tool name `delete_page`):

```js
inputSchema: z.object({
  page_id: z.string().describe("Confluence page/content ID to move to trash"),
}),
```

```js
await confluenceRequest("DELETE", `/content/${page_id}`);
return { content: [{ text: `Page ${page_id} moved to trash`, type: "text" }] };
```

Only trash (single DELETE call), not permanent purge — trash is recoverable, purge is not, and a destructive tool exposed to an LLM caller should default to the reversible operation. Do not add a "permanent delete" option unless explicitly requested later.

Anti-pattern guard specific to this phase — verify before trusting:
The shared `confluenceRequest` helper (Phase 1) does `if (res.status === 204) return null; return res.json();`. Research found that DELETE-to-trash returns HTTP 200, not 204 — and neither the docs nor the live probe confirmed whether that 200 response has a JSON body. If it's an empty 200 (common for DELETE endpoints), `res.json()` will throw on an empty body and `delete_page` will report a false failure on a successful delete. Before relying on `delete_page`, make one real DELETE call against a disposable test page and inspect the raw response body. If it's empty on 200, make the client tolerant of that case specifically for DELETE (e.g. read the response as text first, return null if empty) — do not silently change this without confirming the actual response first.

Verification checklist:
- `pnpm run lint` clean.
- Create a real test page in a scratch/sandbox space, confirm `version.number` starts at 1 in the response.
- Update that same page (change only `title`, omit `body`), confirm the response's `version.number` is 2 and the body content is unchanged.
- Attempt to reuse the same version number on a second update without re-fetching, and record what status/error actually comes back (resolves the 409-vs-community-attested-only gap in the research).
- Delete the test page, confirm the tool reports success and the page shows as trashed in the Confluence UI (or via a subsequent `get_page` returning a trashed-status page).

## Phase 3 — Discovery tools: get by title, search, spaces

`src/tools/get-page-by-title.js` (registerGetPageByTitle, tool name `get_page_by_title`):

```js
inputSchema: z.object({
  space_key: z.string().describe("Confluence space key, e.g. ENG"),
  title: z.string().describe("Exact page title to look up"),
}),
```

```js
const params = new URLSearchParams({
  expand: "body.storage,version",
  spaceKey: space_key,
  title,
});
const result = await confluenceRequest("GET", `/content?${params}`);
```

Source: docs.atlassian.com/atlassian-confluence/REST/6.6.0/; example form confirmed on developer.atlassian.com/server/confluence/confluence-rest-api-examples/. Response is a paginated envelope (`results` array) even for an exact title match — return `result.results[0]` if present, else a clear "not found" message rather than the raw envelope.

`src/tools/search-pages.js` (registerSearchPages, tool name `search_pages`). Mirrors jira-mcp's raw-JQL-passthrough design in search-tickets.js — take a raw CQL string directly rather than building an abstraction over it:

```js
inputSchema: z.object({
  cql: z.string().describe(
    "CQL query, e.g. 'type=page AND space=ENG AND title~\"deploy\"'. Fields: space,title,type,text,label,creator,created,lastmodified. Operators: = != ~ !~ > >= < <= IN. Keywords: AND OR NOT ORDER BY",
  ),
  limit: z.number().default(25).optional().describe("Max results per page"),
  start: z.number().default(0).optional().describe("Pagination offset"),
}),
```

```js
const params = new URLSearchParams({
  cql,
  limit: String(limit),
  start: String(start),
});
const result = await confluenceRequest("GET", `/content/search?${params}`);
```

Source (CQL syntax): developer.atlassian.com/server/confluence/advanced-searching-using-cql/, developer.atlassian.com/server/confluence/cql-field-reference/. Note: CQL parsing itself could not be live-exercised (anonymous probe hit a 403 permission gate before parsing) — confirm actual query behavior against the real host with valid credentials during verification.

`src/tools/list-spaces.js` (registerListSpaces, tool name `list_spaces`):

```js
inputSchema: z.object({
  limit: z.number().default(25).optional().describe("Max results (ignored if space_key is set)"),
  space_key: z.string().optional().describe("Exact space key to fetch a single space; omit to list all spaces"),
}),
```

```js
if (space_key) {
  const space = await confluenceRequest("GET", `/space/${space_key}`);
  return { content: [{ text: JSON.stringify(space, null, 2), type: "text" }] };
}
const params = new URLSearchParams({ limit: String(limit) });
const result = await confluenceRequest("GET", `/space?${params}`);
```

Live-confirmed envelope shape (from a real unauthenticated probe against the host during research): `{"results":[],"start":0,"limit":25,"size":0,"_links":{"base":"https://conf.gem-corp.tech","context":"","self":"https://conf.gem-corp.tech/rest/api/space"}}`.

Verification checklist:
- `pnpm run lint` clean.
- `get_page_by_title` resolves a known real page in a real space; returns a clear not-found message for a nonexistent title rather than throwing.
- `search_pages` with a simple `space=KEY AND type=page` query returns results from a real space.
- `list_spaces` with no `space_key` returns the space list; with `space_key` set to a real key, returns a single space object.

## Phase 4 — Collaboration tools: comments

`src/tools/add-comment.js` (registerAddComment, tool name `add_comment`) — mirrors jira-mcp/src/tools/add-comment.js structure, but Confluence has no dedicated comment endpoint; comments are created through the generic content endpoint with `type:"comment"`:

```js
inputSchema: z.object({
  body: z.string().describe("Comment content in Confluence storage format (XHTML), not Markdown"),
  page_id: z.string().describe("Confluence page/content ID to comment on"),
}),
```

```js
const payload = {
  body: {storage: {representation: "storage", value: body}},
  container: {id: page_id, type: "page"},
  type: "comment",
};
const created = await confluenceRequest("POST", "/content", payload);
```

Gap flagged by research: the official example shows `container` populated from a variable, not a fully spelled-out literal — whether `type:"page"` inside `container` is required or `id` alone suffices was not confirmed in any fetched doc. `type` is included defensively above; verify during smoke test and simplify if `type` turns out to be unnecessary.

`src/tools/get-comments.js` (registerGetComments, tool name `get_comments`):

```js
inputSchema: z.object({
  page_id: z.string().describe("Confluence page/content ID to fetch comments for"),
}),
```

```js
const params = new URLSearchParams({expand: "body.view", limit: "50"});
const result = await confluenceRequest(
  "GET",
  `/content/${page_id}/child/comment?${params}`,
);
```

Source: docs.atlassian.com/atlassian-confluence/REST/6.6.0/; example confirmed on developer.atlassian.com/server/confluence/confluence-rest-api-examples/.

Verification checklist:
- `pnpm run lint` clean.
- Add a comment to a real test page, confirm it appears via `get_comments` and in the Confluence UI.
- Confirm whether `container.type` was actually required (per the gap above) and simplify the payload if not.

## Phase 5 — Optional: labels and attachments

Only build this phase if the user wants full content-management coverage beyond pages/comments/spaces — not required for a working server.

`src/tools/get-labels.js` / `src/tools/add-label.js`:

```
GET  /content/{id}/label            -> {prefix, name}[] under results
POST /content/{id}/label            -> body: [{prefix: "global", name}]
```

Source: docs.atlassian.com/atlassian-confluence/REST/6.6.0/.

`src/tools/list-attachments.js` / `src/tools/add-attachment.js`:

```
GET  /content/{id}/child/attachment
POST /content/{id}/child/attachment   (multipart/form-data, file field, optional comment field)
```

Required header: `X-Atlassian-Token: nocheck` (verified twice against the primary doc; a Cloud-oriented examples page rendered it as "no-check" in one fetch, treated as a scraping artifact since the primary reference's own curl example uses "nocheck" consistently — verify the literal header value against the real host before trusting either spelling).

Anti-pattern guard: attachment upload cannot go through the Phase 1 `confluenceRequest` helper unmodified — that helper always sets `Content-Type: application/json` and always calls `JSON.stringify(body)`. Add a separate function (e.g. `confluenceUpload`) that accepts a `FormData` body, omits the `Content-Type` header (let `fetch` set the multipart boundary automatically), and adds `X-Atlassian-Token: nocheck`. Do not try to force multipart through the JSON-only helper.

Verification checklist:
- `pnpm run lint` clean.
- Add a label to a real test page, confirm via `get_labels`.
- Upload a small test file as an attachment, confirm via `list_attachments` and in the Confluence UI.

## Phase 6 — Final verification and polish

1. Full clean build: `pnpm install`, `pnpm run lint` (zero errors/warnings), `pnpm run build`.
2. Run every implemented tool once end-to-end against the real host (register conf-mcp with an MCP client, same way jira-mcp is registered) and confirm each returns the expected shape, including error cases (nonexistent page ID, invalid space key).
3. Confirm `pnpm run release` produces `release/conf-mcp-v1.0.0.zip` (not `jira-mcp-...`) — validates the Phase 1 package.json rename actually took effect.
4. Re-check `.env` is not staged for commit if/when this project is put under version control (`.gitignore` already excludes it — copied unchanged from jira-mcp, confirmed generic).
5. Confirm no leftover references to `JIRA_*` env vars anywhere in `src/` (grep for `JIRA_`).

Verification checklist:
- Zero biome warnings, zero tsc errors.
- Every tool from Phases 1-4 (and 5, if built) invoked at least once against the real Confluence instance with a real result observed, not just a successful build.
