import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {productRequest} from "@ameforge/atlassian-request";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({path: resolve(__dirname, "../.env")});

// Tolerate MCP client configs that pass literal quotes or a trailing slash.
const HOST = (process.env.CONFLUENCE_HOST ?? "")
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");
const BASE = `${HOST}/rest/api`;
// ATLASSIAN_*: one account shared with Jira, set once for atlassian-mcp.
const AUTH = Buffer.from(
  `${process.env.CONFLUENCE_USERNAME || process.env.ATLASSIAN_USERNAME}:${process.env.CONFLUENCE_PASSWORD || process.env.ATLASSIAN_PASSWORD}`,
).toString("base64");
const HEADERS = {
  Accept: "application/json",
  // A Personal Access Token lets SSO-only accounts (no Confluence password) authenticate.
  Authorization: process.env.CONFLUENCE_TOKEN
    ? `Bearer ${process.env.CONFLUENCE_TOKEN.trim()}`
    : `Basic ${AUTH}`,
  "Content-Type": "application/json",
};

// Only GET is replayed: a 500 on a write may already have saved it.
const {send} = productRequest({
  name: "Confluence",
  parse: (res) => (res.status === 204 ? null : res.json()),
  replayable: ["GET"],
});

export const confluenceRequest = (method, path, body) => {
  const multipart = body instanceof FormData;
  // fetch sets the multipart boundary itself; Confluence rejects uploads without the XSRF opt-out.
  const {"Content-Type": _, ...base} = HEADERS;
  return send(method, `${BASE}${path}`, {
    body: multipart ? body : body ? JSON.stringify(body) : undefined,
    headers: multipart ? {...base, "X-Atlassian-Token": "nocheck"} : HEADERS,
    // Uploads get no timeout: a large file may rightly take longer.
    timeout: !multipart,
  });
};

/** Fetch raw bytes from a site-relative path, e.g. an attachment's `_links.download`. */
export const confluenceDownload = async (path) => {
  const res = await fetch(`${HOST}${path}`, {
    headers: {Authorization: HEADERS.Authorization},
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Confluence API ${res.status}: ${text}`);
  }
  return Buffer.from(await res.arrayBuffer());
};

/** Fetch a page with the version/space/body needed to build an edit payload. */
export const readForEdit = (pageId) =>
  confluenceRequest(
    "GET",
    `/content/${pageId}?expand=version,space,body.storage`,
  );

/** Short result for a write, so tools don't echo the whole page body back. */
export const pageSummary = ({_links, id, title, version}) => ({
  id,
  title,
  url: _links?.webui && `${HOST}${_links.webui}`,
  version: version?.number,
});

/**
 * Write a page's storage body, auto-incrementing the version. Resolves to a pageSummary.
 * @param {string} pageId
 * Pass `parentId` (and `spaceKey` if the parent is in another space) to move it.
 * @param {{value: string, current: any, title?: string, parentId?: string, spaceKey?: string}} opts
 */
export const writePage = (
  pageId,
  {value, current, title, parentId, spaceKey},
) =>
  confluenceRequest("PUT", `/content/${pageId}`, {
    ...(parentId && {ancestors: [{id: parentId}]}),
    body: {storage: {representation: "storage", value}},
    id: pageId,
    space: {key: spaceKey ?? current.space.key},
    title: title ?? current.title,
    type: "page",
    version: {number: current.version.number + 1},
  }).then(pageSummary);
